/* eslint-disable max-len */
import { inject, injectable } from "inversify";
import { JWK } from "node-jose";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { IdServiceInterface } from "@yac/util/src/services/id.service";
import { NotFoundError } from "@yac/util/src/errors/notFound.error";
import { UserId } from "@yac/util/src/types/userId.type";
import { TYPES } from "../../inversion-of-control/types";
import { Jose, JoseFactory } from "../../factories/jose.factory";
import { EnvConfigInterface } from "../../config/env.config";
import { Session, SessionRepositoryInterface, UpdateSessionUpdates } from "../../repositories/session.dynamo.repository";
import { JwksRepositoryInterface } from "../../repositories/jwks.dynamo.repository";
import { OAuth2Error } from "../../errors/oAuth2.error";
import { OAuth2ErrorType } from "../../enums/oAuth2ErrorType.enum";

@injectable()
export class TokenService implements TokenServiceInterface {
  private jose: Jose;

  private apiUrl: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.SessionRepositoryInterface) private sessionRepository: SessionRepositoryInterface,
    @inject(TYPES.JwksRepositoryInterface) private jwksRepository: JwksRepositoryInterface,
    @inject(TYPES.EnvConfigInterface) config: EnvConfigInterface,
    @inject(TYPES.JoseFactory) joseFactory: JoseFactory,
  ) {
    this.jose = joseFactory();
    this.url = config.url;
  }

  public async generateAccessAndRefreshTokens(params: GenerateAccessAndRefreshTokensInput): Promise<GenerateAccessAndRefreshTokensOutput> {
    try {
      this.loggerService.trace("generateAccessAndRefreshTokens called", { params }, this.constructor.name);

      const { clientId, userId, scope } = params;

      const sessionId = this.idService.generateId();

      const { tokenType, accessToken, expiresIn } = await this.generateAccessToken({ clientId, userId, scope, sessionId });

      const refreshToken = `${this.idService.generateId()}${this.idService.generateId()}${this.idService.generateId()}`;

      const nowIso = new Date().toISOString();
      const oneHundredEightyDaysFromNowIso = new Date(Date.now() + (1000 * 60 * 60 * 24 * 180)).toISOString();

      const session: Session = {
        clientId,
        sessionId,
        refreshToken,
        createdAt: nowIso,
        refreshTokenCreatedAt: nowIso,
        refreshTokenExpiresAt: oneHundredEightyDaysFromNowIso,
        userId,
        scope,
      };

      await this.sessionRepository.createSession({ session });

      return { tokenType, accessToken, expiresIn, refreshToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in generateAccessAndRefreshTokens", { error, params }, this.constructor.name);

      if (error instanceof OAuth2Error) {
        throw error;
      }

      throw new OAuth2Error(OAuth2ErrorType.ServerError);
    }
  }

  public async refreshAccessToken(params: RefreshAccessTokenInput): Promise<RefreshAccessTokenOutput> {
    try {
      this.loggerService.trace("refreshAccessToken called", { params }, this.constructor.name);

      const { clientId, refreshToken } = params;

      const { session } = await this.sessionRepository.getSessionByRefreshToken({ clientId, refreshToken });

      if (new Date(session.refreshTokenExpiresAt).getTime() < Date.now().valueOf()) {
        await this.sessionRepository.deleteSession({ clientId, sessionId: session.sessionId });

        throw new OAuth2Error(OAuth2ErrorType.InvalidToken, "refresh_token is expired");
      }

      const { tokenType, accessToken, expiresIn } = await this.generateAccessToken({ clientId, userId: session.userId, scope: session.scope, sessionId: session.sessionId });

      const oneHundredEightyDaysFromNowIso = new Date(Date.now() + (1000 * 60 * 60 * 24 * 180)).toISOString();

      const sessionUpdates: UpdateSessionUpdates = { refreshTokenExpiresAt: oneHundredEightyDaysFromNowIso };

      await this.sessionRepository.updateSession({ clientId, sessionId: session.sessionId, updates: sessionUpdates });

      return { tokenType, accessToken, expiresIn };
    } catch (error: unknown) {
      this.loggerService.error("Error in refreshAccessToken", { error, params }, this.constructor.name);

      if (error instanceof OAuth2Error) {
        throw error;
      }

      throw new OAuth2Error(OAuth2ErrorType.ServerError);
    }
  }

  public async verifyAccessToken(params: VerifyAccessTokenInput): Promise<VerifyAccessTokenOutput> {
    try {
      this.loggerService.trace("verifyAccessToken called", { params }, this.constructor.name);

      const { accessToken } = params;

      const { jwks } = await this.jwksRepository.getJwks();

      const keyStore = await this.jose.JWK.asKeyStore(JSON.parse(jwks.jsonString));

      const { payload } = await this.jose.JWS.createVerify(keyStore).verify(accessToken);

      const decodedToken = JSON.parse(payload.toString()) as AccessTokenPayload;

      const now = Math.round(Date.now().valueOf() / 1000);

      if (decodedToken.exp < now) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidToken, "access_token is expired");
      }

      // Check if access token has been revoked
      await this.sessionRepository.getSession({ clientId: decodedToken.cid, sessionId: decodedToken.sid });

      return { decodedToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in verifyAccessToken", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async revokeTokens(params: RevokeTokensInput): Promise<RevokeTokensOutput> {
    try {
      this.loggerService.trace("revokeTokens called", { params }, this.constructor.name);

      const { clientId, refreshToken } = params;

      const { session } = await this.sessionRepository.getSessionByRefreshToken({ clientId, refreshToken });

      await this.sessionRepository.deleteSession({ clientId, sessionId: session.sessionId });
    } catch (error: unknown) {
      this.loggerService.error("Error in revokeTokens", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async rotateJwks(): Promise<RotateJwksOutput> {
    try {
      this.loggerService.trace("rotateJwks called", {}, this.constructor.name);

      let jwksJsonString: string;
      try {
        const { jwks } = await this.jwksRepository.getJwks();

        jwksJsonString = jwks.jsonString;
      } catch (error) {
        if (!(error instanceof NotFoundError)) {
          throw error;
        }

        // This should only be reached on initial deployment of the stack
        const keyStore = this.jose.JWK.createKeyStore();
        await Promise.all(Array.from({ length: 2 }).map(() => keyStore.generate("RSA", 2048, { alg: "RS256", use: "sig" })));

        jwksJsonString = JSON.stringify(keyStore.toJSON(true));
      }

      const jwksJson = JSON.parse(jwksJsonString) as { keys: unknown[]; };

      // Remove the oldest key from the array
      jwksJson.keys.shift();

      const keyStore = await this.jose.JWK.asKeyStore(jwksJson);
      await keyStore.generate("RSA", 2048, { alg: "RS256", use: "sig" });

      const newJwksJsonString = JSON.stringify(keyStore.toJSON(true));

      await this.jwksRepository.updateJwks({ jwks: { jsonString: newJwksJsonString } });
    } catch (error: unknown) {
      this.loggerService.error("Error in rotateJwks", { error }, this.constructor.name);

      throw error;
    }
  }

  public async getPublicJwks(): Promise<GetPublicJwksOutput> {
    try {
      this.loggerService.trace("getPublicJwks called", {}, this.constructor.name);

      const { jwks } = await this.jwksRepository.getJwks();

      const keyStore = await this.jose.JWK.asKeyStore(JSON.parse(jwks.jsonString));

      const publicJwks = keyStore.toJSON() as { keys: JWK.RawKey[]; };

      return { jwks: publicJwks };
    } catch (error: unknown) {
      this.loggerService.error("Error in getPublicJwks", { error }, this.constructor.name);

      throw error;
    }
  }

  private async generateAccessToken(params: GenerateAccessTokenInput): Promise<GenerateAccessTokenOutput> {
    try {
      this.loggerService.trace("generateAccessToken called", { params }, this.constructor.name);

      const { clientId, userId, scope, sessionId } = params;

      const { jwks } = await this.jwksRepository.getJwks();

      const jwksJson = JSON.parse(jwks.jsonString) as { keys: unknown[]; };

      // Reverse array to ensure usage of the most recent key
      jwksJson.keys.reverse();

      const keyStore = await this.jose.JWK.asKeyStore(jwksJson);

      const key = await this.jose.JWK.asKey(keyStore.all({ use: "sig" })[0]);

      const nowSeconds = Math.round(Date.now().valueOf() / 1000);
      const expiresInSeconds = 60 * 20;

      const payload: AccessTokenPayload = {
        sid: sessionId,
        cid: clientId,
        iss: this.url,
        sub: userId,
        scope,
        nbf: nowSeconds,
        iat: nowSeconds,
        exp: nowSeconds + expiresInSeconds,
        jti: this.idService.generateId(),
      };

      const accessToken = await this.jose.JWS.createSign({ compact: true, fields: { typ: "jwt" } }, key)
        .update(JSON.stringify(payload))
        .final() as unknown as string;

      return { tokenType: "Bearer", accessToken, expiresIn: expiresInSeconds };
    } catch (error: unknown) {
      this.loggerService.error("Error in generateAccessToken", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export type TokenServiceConfigInterface = Pick<EnvConfigInterface, "apiUrl">;

export interface TokenServiceInterface {
  generateAccessAndRefreshTokens(params: GenerateAccessAndRefreshTokensInput): Promise<GenerateAccessAndRefreshTokensOutput>;
  refreshAccessToken(params: RefreshAccessTokenInput): Promise<RefreshAccessTokenOutput>;
  verifyAccessToken(params: VerifyAccessTokenInput): Promise<VerifyAccessTokenOutput>;
  revokeTokens(params: RevokeTokensInput): Promise<RevokeTokensOutput>;
  getPublicJwks(): Promise<GetPublicJwksOutput>;
  rotateJwks(): Promise<RotateJwksOutput>;
}

export interface GenerateAccessAndRefreshTokensInput {
  clientId: string;
  userId: UserId;
  scope: string;
}

export interface GenerateAccessAndRefreshTokensOutput {
  tokenType: "Bearer";
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export interface GenerateAccessTokenInput {
  clientId: string;
  userId: UserId;
  sessionId: string;
  scope: string;
}

export interface GenerateAccessTokenOutput {
  tokenType: "Bearer";
  accessToken: string;
  expiresIn: number;
}

export interface RefreshAccessTokenInput {
  clientId: string;
  refreshToken: string;
}

export interface RefreshAccessTokenOutput {
  tokenType: "Bearer";
  accessToken: string;
  expiresIn: number;
}

export interface VerifyAccessTokenInput {
  accessToken: string;
}

export interface VerifyAccessTokenOutput {
  decodedToken: AccessTokenPayload;
}

export interface RevokeTokensInput {
  clientId: string;
  refreshToken: string;
}

export type RevokeTokensOutput = void;

export interface AccessTokenPayload {
  // clientId
  cid: string;
  // sessionId
  sid: string;
  // issuer
  iss: string;
  // userId
  sub: UserId;
  scope: string;
  // not before date (seconds since 1970)
  nbf: number;
  // issued at date (seconds since 1970)
  iat: number;
  // expiry date (seconds since 1970)
  exp: number;
  // jwtId
  jti: string;
}

export type RotateJwksOutput = void;

export interface GetPublicJwksOutput {
  jwks: {
    keys: JWK.RawKey[];
  }
}
