import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Crypto, CryptoFactory, ForbiddenError, GoogleOAuth2ClientFactory, IdServiceInterface, Jwt, JwtFactory, LoggerServiceInterface, NotFoundError, SmsServiceInterface } from "@yac/util";
import { TYPES } from "../../inversion-of-control/types";
import { MailServiceInterface } from "../tier-1/mail.service";
import { AuthFlowAttempt, AuthFlowAttemptRepositoryInterface, UpdateAuthFlowAttemptUpdates } from "../../repositories/authFlowAttempt.dynamo.repository";
import { Csrf, CsrfFactory } from "../../factories/csrf.factory";
import { User, UserRepositoryInterface } from "../../repositories/user.dynamo.repository";
import { EnvConfigInterface } from "../../config/env.config";
import { TokenServiceInterface } from "../tier-1/token.service";
import { ClientServiceInterface } from "../tier-1/client.service";
import { GrantType } from "../../enums/grantType.enum";
import { PkceChallenge, PkceChallengeFactory } from "../../factories/pkceChallenge.factory";
import { OAuth2Error } from "../../errors/oAuth2.error";
import { OAuth2ErrorType } from "../../enums/oAuth2ErrorType.enum";
import { Client } from "../../repositories/client.dynamo.repository";
import { ExternalProviderAuthFlowAttempt, ExternalProviderAuthFlowAttemptRepositoryInterface } from "../../repositories/externalProvider.AuthFlowAttempt.dynamo.repository";
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
    @inject(TYPES.ClientServiceInterface) private clientService: ClientServiceInterface,
    @inject(TYPES.TokenServiceInterface) private tokenService: TokenServiceInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
    @inject(TYPES.AuthFlowAttemptRepositoryInterface) private authFlowAttemptRepository: AuthFlowAttemptRepositoryInterface,
    @inject(TYPES.ExternalProviderAuthFlowAttemptRepositoryInterface) private externalProviderAuthFlowAttemptRepository: ExternalProviderAuthFlowAttemptRepositoryInterface,
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

  public async login(params: LoginInput): Promise<LoginOutput> {
    try {
      this.loggerService.trace("login called", { params }, this.constructor.name);

      const { clientId, xsrfToken } = params;

      const [ { authFlowAttempt }, { user } ] = await Promise.all([
        this.authFlowAttemptRepository.getAuthFlowAttempt({ clientId, xsrfToken }),
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
        clientId,
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

      const { clientId, confirmationCode, xsrfToken } = params;

      const { authFlowAttempt } = await this.authFlowAttemptRepository.getAuthFlowAttempt({ clientId, xsrfToken });

      const xsrfTokenIsValid = this.csrf.verify(authFlowAttempt.secret, xsrfToken);

      if (!xsrfTokenIsValid || !authFlowAttempt.confirmationCode || confirmationCode !== authFlowAttempt.confirmationCode) {
        throw new ForbiddenError("Forbidden");
      }

      const authorizationCode = this.idService.generateId();

      await this.authFlowAttemptRepository.updateAuthFlowAttempt({
        clientId,
        xsrfToken,
        updates: {
          confirmationCode: "",
          confirmationCodeCreatedAt: "",
          authorizationCode,
          authorizationCodeCreatedAt: new Date().toISOString(),
        },
      });

      return { confirmed: true, authorizationCode };
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async beginAuthFlow(params: BeginAuthFlowInput): Promise<BeginAuthFlowOutput> {
    try {
      this.loggerService.trace("beginAuthFlow called", { params }, this.constructor.name);

      const { clientId, state, codeChallenge, codeChallengeMethod, responseType, redirectUri, scope, externalProvider } = params;

      let client: Client;

      try {
        ({ client } = await this.clientService.getClient({ clientId }));
      } catch (error) {
        throw new OAuth2Error(OAuth2ErrorType.UnauthorizedClient);
      }

      if (redirectUri !== client.redirectUri) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "redirect_uri mismatch");
      }

      if (!client.secret && (!codeChallenge || !codeChallengeMethod)) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "code_challenge & code_challenge_method required for public clients", redirectUri, state);
      }

      if (scope) {
        const requestedScopes = scope.split(" ");
        const clientScopesSet = new Set(client.scopes);
        const invalidScopes = requestedScopes.filter((requestedScope) => !clientScopesSet.has(requestedScope));

        if (invalidScopes.length) {
          throw new OAuth2Error(OAuth2ErrorType.InvalidScope, `Invalid scope requested: ${invalidScopes.join(", ")}.`, redirectUri, state);
        }
      }

      if (externalProvider) {
        const { location, cookies } = await this.beginExternalProviderAuthFlow({ externalProvider, client, state, codeChallenge, codeChallengeMethod, responseType, redirectUri, scope });

        return { location, cookies };
      }

      const { location, cookies } = await this.beginInternalAuthFlow({ client, state, codeChallenge, codeChallengeMethod, responseType, redirectUri, scope });

      return { location, cookies };
    } catch (error: unknown) {
      this.loggerService.error("Error in beginAuthFlow", { error, params }, this.constructor.name);

      if (error instanceof OAuth2Error) {
        throw error;
      }

      throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
    }
  }

  public async completeExternalProviderAuthFlow(params: CompleteExternalProviderAuthFlowInput): Promise<CompleteExternalProviderAuthFlowOutput> {
    try {
      this.loggerService.trace("completeExternalProviderAuthFlow called", { params }, this.constructor.name);

      const { authorizationCode: externalProviderAuthorizationCode, state } = params;

      const oAuth2Client = this.googleOAuth2ClientFactory(this.googleClient.id, this.googleClient.secret, this.googleClient.redirectUri);

      const [ { externalProviderAuthFlowAttempt }, { tokens } ] = await Promise.all([
        this.externalProviderAuthFlowAttemptRepository.getExternalProviderAuthFlowAttempt({ state }),
        oAuth2Client.getToken(externalProviderAuthorizationCode),
      ]);

      if (!tokens.id_token) {
        throw new Error("External Provider response missing id_token");
      }

      const { email } = this.jwt.decode(tokens.id_token) as { email: string; name?: string; };

      const { user } = await this.getOrCreateUser({ email });

      const authorizationCode = this.idService.generateId();

      await this.externalProviderAuthFlowAttemptRepository.deleteExternalProviderAuthFlowAttempt({ state });

      const authFlowAttempt: AuthFlowAttempt = {
        clientId: externalProviderAuthFlowAttempt.clientId,
        xsrfToken: this.idService.generateId(),
        secret: this.idService.generateId(),
        userId: user.id,
        authorizationCode,
        authorizationCodeCreatedAt: new Date().toISOString(),
        responseType: externalProviderAuthFlowAttempt.responseType,
        redirectUri: externalProviderAuthFlowAttempt.redirectUri,
        scope: externalProviderAuthFlowAttempt.scope,
        state: externalProviderAuthFlowAttempt.initialState,
        codeChallenge: externalProviderAuthFlowAttempt.codeChallenge,
        codeChallengeMethod: externalProviderAuthFlowAttempt.codeChallengeMethod,
      };

      await this.authFlowAttemptRepository.createAuthFlowAttempt({ authFlowAttempt });

      const location = `${externalProviderAuthFlowAttempt.redirectUri}?code=${authorizationCode}${externalProviderAuthFlowAttempt.initialState ? `&state=${externalProviderAuthFlowAttempt.initialState}` : ""}`;

      return { location };
    } catch (error: unknown) {
      this.loggerService.error("Error in completeExternalProviderAuthFlow", { error, params }, this.constructor.name);

      if (error instanceof OAuth2Error) {
        throw error;
      }

      throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
    }
  }

  public async getToken(params: GetTokenInput): Promise<GetTokenOutput> {
    try {
      this.loggerService.trace("getToken called", { params }, this.constructor.name);

      const { clientId, authorizationCode, redirectUri, grantType, refreshToken: refreshTokenParam, codeVerifier } = params;

      if (grantType === GrantType.AuthorizationCode) {
        if (!authorizationCode) {
          throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "code required for authorization_code grant type");
        }

        if (!redirectUri) {
          throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "redirect_uri required for authorization_code grant type");
        }

        const { tokenType, accessToken, refreshToken, expiresIn } = await this.handleAuthorizationCodeGrant({ clientId, authorizationCode, redirectUri, codeVerifier });

        return { tokenType, accessToken, refreshToken, expiresIn };
      }

      if (!refreshTokenParam) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "refresh_token required for refresh_token grant type.");
      }

      const { tokenType, accessToken, expiresIn } = await this.handleRefreshTokenGrant({ clientId, refreshToken: refreshTokenParam });

      return { tokenType, accessToken, expiresIn };
    } catch (error: unknown) {
      this.loggerService.error("Error in getToken", { error, params }, this.constructor.name);

      if (error instanceof OAuth2Error) {
        throw error;
      }

      throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
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

  private async beginInternalAuthFlow(params: BeginInternalAuthFlowInput): Promise<BeginInternalAuthFlowOutput> {
    try {
      this.loggerService.trace("beginInternalAuthFlow called", { params }, this.constructor.name);

      const { client, state, codeChallenge, codeChallengeMethod, responseType, redirectUri, scope } = params;

      const secret = state || this.csrf.secretSync();
      const xsrfToken = this.csrf.create(secret);

      const authFlowAttempt: AuthFlowAttempt = {
        clientId: client.id,
        xsrfToken,
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
      const xsrfTokenCookie = `XSRF-TOKEN=${xsrfToken}; Path=/; Secure; HttpOnly; SameSite=Lax`;

      return { location, cookies: [ xsrfTokenCookie ] };
    } catch (error: unknown) {
      this.loggerService.error("Error in beginInternalAuthFlow", { error, params }, this.constructor.name);

      if (error instanceof OAuth2Error) {
        throw error;
      }

      throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
    }
  }

  private async beginExternalProviderAuthFlow(params: BeginExternalProviderAuthFlowInput): Promise<BeginExternalProviderAuthFlowOutput> {
    try {
      this.loggerService.trace("beginExternalProviderAuthFlow called", { params }, this.constructor.name);

      const { externalProvider, client, state: initialState, codeChallenge, codeChallengeMethod, responseType, redirectUri, scope } = params;

      const state = this.idService.generateId();

      const externalProviderAuthFlowAttempt: ExternalProviderAuthFlowAttempt = {
        state,
        externalProvider,
        clientId: client.id,
        responseType,
        redirectUri,
        scope: scope || client.scopes.join(" "),
        initialState,
        codeChallenge,
        codeChallengeMethod,
      };

      await this.externalProviderAuthFlowAttemptRepository.createExternalProviderAuthFlowAttempt({ externalProviderAuthFlowAttempt });

      if (externalProvider === ExternalProvider.Slack) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "external_provider slack not supported at this time", redirectUri);
      }

      const oAuth2Client = this.googleOAuth2ClientFactory(this.googleClient.id, this.googleClient.secret, this.googleClient.redirectUri);

      const location = oAuth2Client.generateAuthUrl({ scope: [ "openid", "email" ], state });

      return { location, cookies: [] };
    } catch (error: unknown) {
      this.loggerService.error("Error in beginExternalProviderAuthFlow", { error, params }, this.constructor.name);

      if (error instanceof OAuth2Error) {
        throw error;
      }

      throw new OAuth2Error(OAuth2ErrorType.AccessDenied);
    }
  }

  private async handleAuthorizationCodeGrant(params: HandleAuthorizationCodeGrantInput): Promise<HandleAuthorizationCodeGrantOutput> {
    try {
      this.loggerService.trace("handleAuthorizationCodeGrant called", { params }, this.constructor.name);

      const { clientId, authorizationCode, redirectUri, codeVerifier } = params;

      const { authFlowAttempt } = await this.authFlowAttemptRepository.getAuthFlowAttemptByAuthorizationCode({ clientId, authorizationCode });

      if (authFlowAttempt.redirectUri !== redirectUri) {
        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "redirect_uri mismatch");
      }

      if (authFlowAttempt.codeChallenge) {
        if (!codeVerifier) {
          throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "code_verifier required", redirectUri);
        }

        const codeChallengeVerified = this.pkceChallenge.verifyChallenge(codeVerifier, authFlowAttempt.codeChallenge);

        if (!codeChallengeVerified) {
          await this.authFlowAttemptRepository.deleteAuthFlowAttempt({ clientId, xsrfToken: authFlowAttempt.xsrfToken });

          throw new OAuth2Error(OAuth2ErrorType.AccessDenied, "Access Denied", redirectUri);
        }
      }

      if (!authFlowAttempt.userId) {
        await this.authFlowAttemptRepository.deleteAuthFlowAttempt({ clientId, xsrfToken: authFlowAttempt.xsrfToken });

        throw new OAuth2Error(OAuth2ErrorType.ServerError);
      }

      // Check if authorization code is older than 60 secods
      if (!authFlowAttempt.authorizationCodeCreatedAt || (new Date(authFlowAttempt.authorizationCodeCreatedAt).getTime() + (1000 * 60)) < Date.now().valueOf()) {
        await this.authFlowAttemptRepository.deleteAuthFlowAttempt({ clientId, xsrfToken: authFlowAttempt.xsrfToken });

        throw new OAuth2Error(OAuth2ErrorType.InvalidRequest, "code expired", redirectUri);
      }

      const [ { tokenType, accessToken, expiresIn, refreshToken } ] = await Promise.all([
        this.tokenService.generateAccessAndRefreshTokens({ clientId, userId: authFlowAttempt.userId, scope: authFlowAttempt.scope }),
        this.authFlowAttemptRepository.deleteAuthFlowAttempt({ clientId, xsrfToken: authFlowAttempt.xsrfToken }),
      ]);

      return { tokenType, accessToken, expiresIn, refreshToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in handleAuthorizationCodeGrant", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async handleRefreshTokenGrant(params: HandleRefreshTokenGrantInput): Promise<HandleRefreshTokenGrantOutput> {
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
  login(params: LoginInput): Promise<LoginOutput>;
  confirm(params: ConfirmInput): Promise<ConfirmOutput>;
  beginAuthFlow(params: BeginAuthFlowInput): Promise<BeginAuthFlowOutput>;
  completeExternalProviderAuthFlow(params: CompleteExternalProviderAuthFlowInput): Promise<CompleteExternalProviderAuthFlowOutput>
  getToken(params: GetTokenInput): Promise<GetTokenOutput>;
  revokeTokens(params: RevokeTokensInput): Promise<RevokeTokensOutput>;
}

export type AuthServiceConfigInterface = Pick<EnvConfigInterface, "authUI" | "googleClient">;

interface BaseLoginInput {
  clientId: string;
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

export interface BaseConfirmInput {
  clientId: string;
  confirmationCode: string;
  xsrfToken: string;
}
interface EmailConfirmInput extends BaseConfirmInput {
  email: string;
}

interface PhoneConfirmInput extends BaseConfirmInput {
  phone: string;
}

export type ConfirmInput = EmailConfirmInput | PhoneConfirmInput;

interface ConfirmFailureOutput {
  confirmed: false;
  session: string;
}
interface ConfirmSuccessOutput {
  confirmed: true;
  authorizationCode: string;
}

export type ConfirmOutput = ConfirmFailureOutput | ConfirmSuccessOutput;

export interface BeginAuthFlowInput {
  clientId: string;
  responseType: string;
  redirectUri: string;
  state?: string;
  scope?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  externalProvider?: ExternalProvider;
}

export interface BeginAuthFlowOutput {
  location: string;
  cookies: string[];
}

export interface CompleteExternalProviderAuthFlowInput {
  authorizationCode: string;
  state: string;
}

export interface CompleteExternalProviderAuthFlowOutput {
  location: string;
}

export interface GetTokenInput {
  clientId: string;
  grantType: GrantType;
  redirectUri?: string;
  authorizationCode?: string;
  codeVerifier?: string;
  refreshToken?: string;
}

export interface GetTokenOutput {
  accessToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  refreshToken?: string;
  idToken?: string;
}

export interface RevokeTokensInput {
  clientId: string;
  refreshToken: string;
}

export type RevokeTokensOutput = void;

interface BeginInternalAuthFlowInput {
  client: Client;
  responseType: string;
  redirectUri: string;
  state?: string;
  scope?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

interface BeginInternalAuthFlowOutput {
  location: string;
  cookies: string[];
}

interface BeginExternalProviderAuthFlowInput {
  externalProvider: ExternalProvider;
  client: Client;
  responseType: string;
  redirectUri: string;
  state?: string;
  scope?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

interface BeginExternalProviderAuthFlowOutput {
  location: string;
  cookies: string[];
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
