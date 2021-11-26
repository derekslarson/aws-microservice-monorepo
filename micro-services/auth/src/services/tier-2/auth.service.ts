import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Crypto, CryptoFactory, GoogleOAuth2ClientFactory, IdServiceInterface, Jwt, JwtFactory, LoggerServiceInterface, NotFoundError, SmsServiceInterface } from "@yac/util";
import { TYPES } from "../../inversion-of-control/types";
import { MailServiceInterface } from "../tier-1/mail.service";
import { AuthFlowAttempt, AuthFlowAttemptRepositoryInterface, UpdateAuthFlowAttemptUpdates } from "../../repositories/authFlowAttempt.dynamo.repository";
import { Csrf, CsrfFactory } from "../../factories/csrf.factory";
import { User, UserRepositoryInterface } from "../../repositories/user.dynamo.repository";
import { EnvConfigInterface } from "../../config/env.config";
import { TokenServiceInterface, GetPublicJwksOutput as TokenServiceGetPublicJwksOutput } from "../tier-1/token.service";
import { PkceChallenge, PkceChallengeFactory } from "../../factories/pkceChallenge.factory";
import { OAuth2Error } from "../../errors/oAuth2.error";
import { OAuth2ErrorType } from "../../enums/oAuth2ErrorType.enum";
import { Client } from "../../repositories/client.dynamo.repository";
import { ExternalProvider } from "../../enums/externalProvider.enum";

@injectable()
export class AuthService implements AuthServiceInterface {
  private authUiUrl: string;

  private crypto: Crypto;

  private csrf: Csrf;

  private pkceChallenge: PkceChallenge;

  private jwt: Jwt;

  private googleClient: AuthServiceConfigInterface["googleClient"];

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MailServiceInterface) private mailService: MailServiceInterface,
    @inject(TYPES.SmsServiceInterface) private smsService: SmsServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.TokenServiceInterface) private tokenService: TokenServiceInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
    @inject(TYPES.AuthFlowAttemptRepositoryInterface) private authFlowAttemptRepository: AuthFlowAttemptRepositoryInterface,
    @inject(TYPES.GoogleOAuth2ClientFactory) private googleOAuth2ClientFactory: GoogleOAuth2ClientFactory,
    @inject(TYPES.CryptoFactory) cryptoFactory: CryptoFactory,
    @inject(TYPES.CsrfFactory) csrfFactory: CsrfFactory,
    @inject(TYPES.PkceChallengeFactory) pkceChallengeFactory: PkceChallengeFactory,
    @inject(TYPES.JwtFactory) jwtFactory: JwtFactory,
    @inject(TYPES.EnvConfigInterface) config: AuthServiceConfigInterface,
  ) {
    this.authUiUrl = config.authUI;
    this.googleClient = config.googleClient;
    this.crypto = cryptoFactory();
    this.csrf = csrfFactory();
    this.pkceChallenge = pkceChallengeFactory();
    this.jwt = jwtFactory();
  }

  public async beginAuthFlow(params: BeginAuthFlowInput): Promise<BeginAuthFlowOutput> {
    try {
      this.loggerService.trace("beginAuthFlow called", { params }, this.constructor.name);

      const { client, state, codeChallenge, codeChallengeMethod, responseType, redirectUri, scope } = params;

      const secret = state || this.csrf.secretSync();
      const xsrfToken = this.csrf.create(secret);

      const authFlowAttempt: AuthFlowAttempt = {
        xsrfToken,
        clientId: client.id,
        secret,
        responseType,
        redirectUri,
        scope: scope || client.scopes.join(" "),
        state,
        codeChallenge,
        codeChallengeMethod,
      };

      await this.authFlowAttemptRepository.createAuthFlowAttempt({ authFlowAttempt });

      const optionalQueryParams = { code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod, scope, state };
      const optionalQueryString = Object.entries(optionalQueryParams).reduce((acc, [ key, value ]) => (value ? `${acc}&${key}=${value}` : acc), "");

      const location = `${this.authUiUrl}?client_id=${client.id}&redirect_uri=${redirectUri}&response_type=${responseType}${optionalQueryString}`;
      const xsrfTokenCookie = `XSRF-TOKEN=${xsrfToken}; Path=/; Secure; HttpOnly; SameSite=Lax; Expires=${new Date(Date.now().valueOf() + (1000 * 60 * 2)).toUTCString()}`;

      return { location, cookies: [ xsrfTokenCookie ] };
    } catch (error: unknown) {
      this.loggerService.error("Error in beginAuthFlow", { error, params }, this.constructor.name);

      if (error instanceof OAuth2Error) {
        throw error;
      }

      throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
    }
  }

  public async login(params: LoginInput): Promise<LoginOutput> {
    try {
      this.loggerService.trace("login called", { params }, this.constructor.name);

      const { xsrfToken } = params;

      const [ { authFlowAttempt }, { user } ] = await Promise.all([
        this.authFlowAttemptRepository.getAuthFlowAttempt({ xsrfToken }),
        this.getOrCreateUser(params),
      ]);

      const xsrfTokenIsValid = this.csrf.verify(authFlowAttempt.secret, xsrfToken);

      if (!xsrfTokenIsValid) {
        throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
      }

      const confirmationCode = this.crypto.randomDigits(6).join("");

      const authFlowAttemptUpdates: UpdateAuthFlowAttemptUpdates = {
        userId: user.id,
        confirmationCode,
        confirmationCodeCreatedAt: new Date().toISOString(),
      };

      await this.authFlowAttemptRepository.updateAuthFlowAttempt({
        xsrfToken,
        updates: authFlowAttemptUpdates,
      });

      if ("email" in params) {
        await this.mailService.sendConfirmationCode(params.email, confirmationCode);
      } else {
        await this.smsService.publish({ phoneNumber: params.phone, message: `Your Yac login code is ${confirmationCode}` });
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in login", { error, params }, this.constructor.name);

      if (error instanceof OAuth2Error) {
        throw error;
      }

      throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
    }
  }

  public async confirm(params: ConfirmInput): Promise<ConfirmOutput> {
    try {
      this.loggerService.trace("confirm called", { params }, this.constructor.name);

      const { confirmationCode, xsrfToken } = params;

      const { authFlowAttempt } = await this.authFlowAttemptRepository.getAuthFlowAttempt({ xsrfToken });

      const xsrfTokenIsValid = this.csrf.verify(authFlowAttempt.secret, xsrfToken);

      if (!xsrfTokenIsValid || !authFlowAttempt.confirmationCode || confirmationCode !== authFlowAttempt.confirmationCode) {
        throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
      }

      const authorizationCode = this.idService.generateId();

      await this.authFlowAttemptRepository.updateAuthFlowAttempt({
        xsrfToken,
        updates: {
          confirmationCode: "",
          confirmationCodeCreatedAt: "",
          authorizationCode,
          authorizationCodeCreatedAt: new Date().toISOString(),
        },
      });

      const xsrfTokenDeletionCookie = "XSRF-TOKEN=; Path=/; Secure; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT";

      return { authorizationCode, cookies: [ xsrfTokenDeletionCookie ] };
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async loginViaExternalProvider(params: LoginViaExternalProviderInput): Promise<LoginViaExternalProviderOutput> {
    try {
      this.loggerService.trace("loginViaExternalProvider called", { params }, this.constructor.name);

      const { xsrfToken, externalProvider } = params;

      if (externalProvider === ExternalProvider.Slack) {
        throw new Error("Slack not available at this time.");
      }

      const externalProviderState = this.idService.generateId();

      await this.authFlowAttemptRepository.updateAuthFlowAttempt({ xsrfToken, updates: { externalProviderState } });

      const oAuth2Client = this.googleOAuth2ClientFactory(this.googleClient.id, this.googleClient.secret, this.googleClient.redirectUri);

      const location = oAuth2Client.generateAuthUrl({ scope: [ "openid", "email" ], state: externalProviderState });

      return { location };
    } catch (error: unknown) {
      this.loggerService.error("Error in loginViaExternalProvider", { error, params }, this.constructor.name);

      if (error instanceof OAuth2Error) {
        throw error;
      }

      throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
    }
  }

  public async completeExternalProviderAuthFlow(params: CompleteExternalProviderAuthFlowInput): Promise<CompleteExternalProviderAuthFlowOutput> {
    try {
      this.loggerService.trace("completeExternalProviderAuthFlow called", { params }, this.constructor.name);

      const { authorizationCode: externalProviderAuthorizationCode, xsrfToken, state } = params;

      const oAuth2Client = this.googleOAuth2ClientFactory(this.googleClient.id, this.googleClient.secret, this.googleClient.redirectUri);

      const [ { authFlowAttempt }, { tokens } ] = await Promise.all([
        this.authFlowAttemptRepository.getAuthFlowAttempt({ xsrfToken }),
        oAuth2Client.getToken(externalProviderAuthorizationCode),
      ]);

      if (authFlowAttempt.externalProviderState !== state) {
        throw new Error("State mismatch");
      }

      if (!tokens.id_token) {
        throw new Error("External Provider response missing id_token");
      }

      const { email } = this.jwt.decode(tokens.id_token) as { email: string; name?: string; };

      const { user } = await this.getOrCreateUser({ email });

      const authorizationCode = this.idService.generateId();

      const authFlowAttemptUpdates: UpdateAuthFlowAttemptUpdates = {
        userId: user.id,
        authorizationCode,
        authorizationCodeCreatedAt: new Date().toISOString(),
        externalProviderState: "",
      };

      await this.authFlowAttemptRepository.updateAuthFlowAttempt({ xsrfToken, updates: authFlowAttemptUpdates });

      const location = `${authFlowAttempt.redirectUri}?code=${authorizationCode}${authFlowAttempt.state ? `&state=${authFlowAttempt.state}` : ""}`;
      const xsrfTokenDeletionCookie = "XSRF-TOKEN=; Path=/; Secure; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT";

      return { location, cookies: [ xsrfTokenDeletionCookie ] };
    } catch (error: unknown) {
      this.loggerService.error("Error in completeExternalProviderAuthFlow", { error, params }, this.constructor.name);

      if (error instanceof OAuth2Error) {
        throw error;
      }

      throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
    }
  }

  public async handleAuthorizationCodeGrant(params: HandleAuthorizationCodeGrantInput): Promise<HandleAuthorizationCodeGrantOutput> {
    try {
      this.loggerService.trace("handleAuthorizationCodeGrant called", { params }, this.constructor.name);

      const { clientId, authorizationCode, redirectUri, codeVerifier } = params;

      const { authFlowAttempt } = await this.authFlowAttemptRepository.getAuthFlowAttemptByAuthorizationCode({ authorizationCode });

      if (authFlowAttempt.redirectUri !== redirectUri) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "redirect_uri mismatch");
      }

      if (authFlowAttempt.codeChallenge) {
        if (!codeVerifier) {
          throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "code_verifier required", redirectUri);
        }

        const codeChallengeVerified = this.pkceChallenge.verifyChallenge(codeVerifier, authFlowAttempt.codeChallenge);

        if (!codeChallengeVerified) {
          await this.authFlowAttemptRepository.deleteAuthFlowAttempt({ xsrfToken: authFlowAttempt.xsrfToken });

          throw new OAuth2Error(OAuth2ErrorType.AccessDenied, "Access Denied", redirectUri);
        }
      }

      if (!authFlowAttempt.userId) {
        await this.authFlowAttemptRepository.deleteAuthFlowAttempt({ xsrfToken: authFlowAttempt.xsrfToken });

        throw new OAuth2Error(OAuth2ErrorType.ServerError);
      }

      // Check if authorization code is older than 60 secods
      if (!authFlowAttempt.authorizationCodeCreatedAt || (new Date(authFlowAttempt.authorizationCodeCreatedAt).getTime() + (1000 * 60)) < Date.now().valueOf()) {
        await this.authFlowAttemptRepository.deleteAuthFlowAttempt({ xsrfToken: authFlowAttempt.xsrfToken });

        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "code expired", redirectUri);
      }

      const [ { tokenType, accessToken, expiresIn, refreshToken } ] = await Promise.all([
        this.tokenService.generateAccessAndRefreshTokens({ clientId, userId: authFlowAttempt.userId, scope: authFlowAttempt.scope }),
        this.authFlowAttemptRepository.deleteAuthFlowAttempt({ xsrfToken: authFlowAttempt.xsrfToken }),
      ]);

      return { tokenType, accessToken, expiresIn, refreshToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in handleAuthorizationCodeGrant", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async handleRefreshTokenGrant(params: HandleRefreshTokenGrantInput): Promise<HandleRefreshTokenGrantOutput> {
    try {
      this.loggerService.trace("handleRefreshTokenGrant called", { params }, this.constructor.name);

      const { clientId, refreshToken } = params;

      const { tokenType, accessToken, expiresIn } = await this.tokenService.refreshAccessToken({ clientId, refreshToken });

      return { tokenType, accessToken, expiresIn };
    } catch (error: unknown) {
      this.loggerService.error("Error in handleRefreshTokenGrant", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async revokeTokens(params: RevokeTokensInput): Promise<RevokeTokensOutput> {
    try {
      this.loggerService.trace("revokeTokens called", { params }, this.constructor.name);

      const { clientId, refreshToken } = params;

      await this.tokenService.revokeTokens({ clientId, refreshToken });
    } catch (error: unknown) {
      this.loggerService.error("Error in revokeTokens", { error, params }, this.constructor.name);

      if (error instanceof OAuth2Error) {
        throw error;
      }

      throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
    }
  }

  public async getPublicJwks(): Promise<GetPublicJwksOutput> {
    try {
      this.loggerService.trace("getPublicJwks called", { }, this.constructor.name);

      const { jwks } = await this.tokenService.getPublicJwks();

      return { jwks };
    } catch (error: unknown) {
      this.loggerService.error("Error in getPublicJwks", { error }, this.constructor.name);

      throw error;
    }
  }

  private async getOrCreateUser(params: GetOrCreateUserInput): Promise<GetOrCreateUserOutput> {
    try {
      this.loggerService.trace("getOrCreateUser called", { params }, this.constructor.name);

      let user: User;

      try {
        ({ user } = "email" in params ? await this.userRepository.getUserByEmail({ email: params.email }) : await this.userRepository.getUserByPhone({ phone: params.phone }));
      } catch (error) {
        if (!(error instanceof NotFoundError)) {
          throw error;
        }

        const userEntity: User = {
          id: `user-${this.idService.generateId()}`,
          createdAt: new Date().toISOString(),
          ...("email" in params ? { email: params.email } : { phone: params.phone }),
        };

        ({ user } = await this.userRepository.createUser({ user: userEntity }));
      }

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOrCreateUser", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface AuthServiceInterface {
  beginAuthFlow(params: BeginAuthFlowInput): Promise<BeginAuthFlowOutput>;
  login(params: LoginInput): Promise<LoginOutput>;
  confirm(params: ConfirmInput): Promise<ConfirmOutput>;
  loginViaExternalProvider(params: LoginViaExternalProviderInput): Promise<LoginViaExternalProviderOutput>
  completeExternalProviderAuthFlow(params: CompleteExternalProviderAuthFlowInput): Promise<CompleteExternalProviderAuthFlowOutput>
  handleAuthorizationCodeGrant(params: HandleAuthorizationCodeGrantInput): Promise<HandleAuthorizationCodeGrantOutput>;
  handleRefreshTokenGrant(params: HandleRefreshTokenGrantInput): Promise<HandleRefreshTokenGrantOutput>;
  revokeTokens(params: RevokeTokensInput): Promise<RevokeTokensOutput>;
  getPublicJwks(): Promise<GetPublicJwksOutput>;
}

export type AuthServiceConfigInterface = Pick<EnvConfigInterface, "authUI" | "googleClient">;

interface BaseLoginInput {
  xsrfToken: string;
}

interface EmailLoginInput extends BaseLoginInput {
  email: string;
}

interface PhoneLoginInput extends BaseLoginInput {
  phone: string;
}

export type LoginInput = EmailLoginInput | PhoneLoginInput;
export type LoginOutput = void;

export interface LoginViaExternalProviderInput {
  externalProvider: ExternalProvider;
  xsrfToken: string;
}

export interface LoginViaExternalProviderOutput {
  location: string;
}

export interface ConfirmInput {
  confirmationCode: string;
  xsrfToken: string;
}
export interface ConfirmOutput {
  authorizationCode: string;
  cookies: string[];
}

export interface BeginAuthFlowInput {
  client: Client;
  responseType: string;
  redirectUri: string;
  state?: string;
  scope?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

export interface BeginAuthFlowOutput {
  location: string;
  cookies: string[];
}

export interface CompleteExternalProviderAuthFlowInput {
  xsrfToken: string;
  authorizationCode: string;
  state: string;
}

export interface CompleteExternalProviderAuthFlowOutput {
  location: string;
  cookies: string[];
}
export interface RevokeTokensInput {
  clientId: string;
  refreshToken: string;
}

export type RevokeTokensOutput = void;

export interface GetPublicJwksOutput {
  jwks: TokenServiceGetPublicJwksOutput["jwks"]
}

interface HandleAuthorizationCodeGrantInput {
  clientId: string;
  authorizationCode: string;
  redirectUri: string;
  codeVerifier?: string;
}

interface HandleAuthorizationCodeGrantOutput {
  accessToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  refreshToken: string;
  idToken?: string;
}

interface HandleRefreshTokenGrantInput {
  clientId: string;
  refreshToken: string;
}

interface HandleRefreshTokenGrantOutput {
  accessToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  idToken?: string;
}

type GetOrCreateUserInput = { email: string; } | { phone: string; };
interface GetOrCreateUserOutput {
  user: User;
}
