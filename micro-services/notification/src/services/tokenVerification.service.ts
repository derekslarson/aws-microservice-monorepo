/* eslint-disable max-len */
import { inject, injectable } from "inversify";
import { ForbiddenError, HttpRequestServiceInterface, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { Jwt, JwtFactory } from "../factories/jwt.factory";
import { Jwk, JwkToPem, JwkToPemFactory } from "../factories/jwkToPem.factory";

@injectable()
export class TokenVerificationService implements TokenVerificationServiceInterface {
  private jwksUrl: string;

  private jwt: Jwt;

  private jwkToPem: JwkToPem;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.HttpRequestServiceInterface) private httpRequestService: HttpRequestServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: TokenVerificationServiceConfig,
    @inject(TYPES.JwtFactory) jwtFactory: JwtFactory,
    @inject(TYPES.JwkToPemFactory) jwkToPemFactory: JwkToPemFactory,
  ) {
    this.jwksUrl = config.jwksUrl;
    this.jwt = jwtFactory();
    this.jwkToPem = jwkToPemFactory();
  }

  public async verifyToken(params: VerifyTokenInput): Promise<VerifyTokenOutput> {
    try {
      this.loggerService.trace("verifyToken called", { params }, this.constructor.name);

      const { token } = params;

      const { body: { keys: jwks } } = await this.httpRequestService.get<{ keys: Jwk[] }>(this.jwksUrl);

      const { header: { kid } } = this.jwt.decode(token, { complete: true }) || { header: {} };

      const tokenJwk = jwks.find((jwk) => jwk.kid === kid);

      if (!tokenJwk) {
        throw new ForbiddenError("Forbidden");
      }

      const pem = this.jwkToPem(tokenJwk);

      const decodedToken = this.jwt.verify(token, pem, { algorithms: [ "RS256" ] }) as DecodedToken;

      return { decodedToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in verifyToken", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

type TokenVerificationServiceConfig = Pick<EnvConfigInterface, "jwksUrl">;

export interface TokenVerificationServiceInterface {
  verifyToken(params: VerifyTokenInput): Promise<VerifyTokenOutput>;
}

export interface VerifyTokenInput {
  token: string;
}

export interface DecodedToken {
  // userId
  username: string;
}

export interface VerifyTokenOutput {
  decodedToken: DecodedToken;
}
