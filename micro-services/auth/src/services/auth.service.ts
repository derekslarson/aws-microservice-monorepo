import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BadRequestError, Crypto, CryptoFactory, ForbiddenError, IdServiceInterface, LoggerServiceInterface, NotFoundError, SmsServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MailServiceInterface } from "./mail.service";
import { AuthFlowAttempt, AuthFlowAttemptRepositoryInterface, UpdateAuthFlowAttemptUpdates } from "../repositories/authFlowAttempt.dynamo.repository";
import { Csrf, CsrfFactory } from "../factories/csrf.factory";
import { User, UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { EnvConfigInterface } from "../config/env.config";
import { TokenServiceInterface } from "./token.service";
import { Session, SessionRepositoryInterface, UpdateSessionUpdates } from "../repositories/session.dyanmo.repository";
import { ClientServiceInterface } from "./client.service";
import { GrantType } from "../enums/grantType.enum";
import { PkceChallenge, PkceChallengeFactory } from "../factories/pkceChallenge.factory";

@injectable()
export class AuthService implements AuthServiceInterface {
  private authUiUrl: string;

  private crypto: Crypto;

  private csrf: Csrf;

  private pkceChallenge: PkceChallenge;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MailServiceInterface) private mailService: MailServiceInterface,
    @inject(TYPES.SmsServiceInterface) private smsService: SmsServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ClientServiceInterface) private clientService: ClientServiceInterface,
    @inject(TYPES.TokenServiceInterface) private tokenService: TokenServiceInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
    @inject(TYPES.AuthFlowAttemptRepositoryInterface) private authFlowAttemptRepository: AuthFlowAttemptRepositoryInterface,
    @inject(TYPES.SessionRepositoryInterface) private sessionRepository: SessionRepositoryInterface,
    @inject(TYPES.EnvConfigInterface) config: AuthServiceConfigInterface,
    @inject(TYPES.CryptoFactory) cryptoFactory: CryptoFactory,
    @inject(TYPES.CsrfFactory) csrfFactory: CsrfFactory,
    @inject(TYPES.PkceChallengeFactory) pkceChallengeFactory: PkceChallengeFactory,
  ) {
    this.authUiUrl = config.authUI;
    this.crypto = cryptoFactory();
    this.csrf = csrfFactory();
    this.pkceChallenge = pkceChallengeFactory();
  }

  public async login(params: LoginInput): Promise<LoginOutput> {
    try {
      this.loggerService.trace("login called", { params }, this.constructor.name);

      const { clientId, xsrfToken } = params;

      const { authFlowAttempt } = await this.authFlowAttemptRepository.getAuthFlowAttempt({ clientId, xsrfToken });

      const xsrfTokenIsValid = this.csrf.verify(authFlowAttempt.secret, xsrfToken);

      if (!xsrfTokenIsValid) {
        throw new ForbiddenError("Forbidden");
      }

      const { user } = await this.getOrCreateUser(params);

      // Verify that auth flow attempt exists so upsert doesn't occur
      await this.authFlowAttemptRepository.getAuthFlowAttempt({ clientId, xsrfToken });

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

      throw error;
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

      const { host, clientId, state, codeChallenge, codeChallengeMethod, responseType, redirectUri, scope } = params;

      const { client } = await this.clientService.getClient({ clientId });

      if (!client.secret && (!codeChallenge || !codeChallengeMethod)) {
        throw new BadRequestError("code_challenge & code_challenge_method required for public clients");
      }

      if (redirectUri !== client.redirectUri) {
        throw new ForbiddenError("Forbidden");
      }

      if (scope) {
        const requestedScopes = scope.split(" ");
        const clientScopesSet = new Set(client.scopes);
        const invalidScopeRequested = requestedScopes.some((requestedScope) => !clientScopesSet.has(requestedScope));

        if (invalidScopeRequested) {
          throw new ForbiddenError("Forbidden");
        }
      }

      const secret = state || this.csrf.secretSync();
      const xsrfToken = this.csrf.create(secret);

      const authFlowAttempt: AuthFlowAttempt = {
        clientId,
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

      const location = `${this.authUiUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}${optionalQueryString}`;
      const xsrfTokenCookie = `XSRF-TOKEN=${xsrfToken}; Path=/; Domain=${host}; Secure; HttpOnly; SameSite=Lax`;

      return { location, cookies: [ xsrfTokenCookie ] };
    } catch (error: unknown) {
      this.loggerService.error("Error in beginAuthFlow", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getToken(params: GetTokenInput): Promise<GetTokenOutput> {
    try {
      this.loggerService.trace("getToken called", { params }, this.constructor.name);

      const { clientId, authorizationCode, redirectUri, grantType, refreshToken: refreshTokenParam, codeVerifier } = params;

      if (grantType === GrantType.AuthorizationCode) {
        if (!authorizationCode) {
          throw new BadRequestError("code required for authorization_code grant type.");
        }

        if (!redirectUri) {
          throw new BadRequestError("redirect_uri required for authorization_code grant type.");
        }

        const { tokenType, accessToken, refreshToken, expiresIn } = await this.handleAuthorizationCodeGrant({ clientId, authorizationCode, redirectUri, codeVerifier });

        return { tokenType, accessToken, refreshToken, expiresIn };
      }

      if (!refreshTokenParam) {
        throw new BadRequestError("refresh_token required for refresh_token grant type.");
      }

      const { tokenType, accessToken, expiresIn } = await this.handleRefreshTokenGrant({ clientId, refreshToken: refreshTokenParam });

      return { tokenType, accessToken, expiresIn };
    } catch (error: unknown) {
      this.loggerService.error("Error in getToken", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteSession(params: DeleteSessionInput): Promise<DeleteSessionOutput> {
    try {
      this.loggerService.trace("deleteSession called", { params }, this.constructor.name);

      const { clientId, refreshToken } = params;

      const { session } = await this.sessionRepository.getSessionByRefreshToken({ clientId, refreshToken });

      await this.sessionRepository.deleteSession({ clientId, sessionId: session.sessionId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteSession", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async handleAuthorizationCodeGrant(params: HandleAuthorizationCodeGrantInput): Promise<HandleAuthorizationCodeGrantOutput> {
    try {
      this.loggerService.trace("handleAuthorizationCodeGrant called", { params }, this.constructor.name);

      const { clientId, authorizationCode, redirectUri, codeVerifier } = params;

      const { authFlowAttempt } = await this.authFlowAttemptRepository.getAuthFlowAttemptByAuthorizationCode({ clientId, authorizationCode });

      if (authFlowAttempt.redirectUri !== redirectUri) {
        throw new ForbiddenError("Forbidden");
      }

      if (authFlowAttempt.codeChallenge) {
        if (!codeVerifier) {
          throw new ForbiddenError("Forbidden");
        }

        const codeChallengeVerified = this.pkceChallenge.verifyChallenge(codeVerifier, authFlowAttempt.codeChallenge);

        if (!codeChallengeVerified) {
          throw new ForbiddenError("Forbidden");
        }
      }

      if (!authFlowAttempt.userId) {
        throw new Error("Malformed Auth Flow Attempt.");
      }

      const sessionId = this.idService.generateId();

      const [ { tokenType, accessToken, expiresIn, refreshToken } ] = await Promise.all([
        this.tokenService.generateAccessToken({ clientId, sessionId, userId: authFlowAttempt.userId, scope: authFlowAttempt.scope }),
        this.authFlowAttemptRepository.deleteAuthFlowAttempt({ clientId, xsrfToken: authFlowAttempt.xsrfToken }),
      ]);

      const now = new Date().toISOString();

      const session: Session = {
        clientId,
        sessionId,
        refreshToken,
        createdAt: now,
        refreshTokenCreatedAt: now,
        refreshTokenExpiresAt: new Date(Date.now() + (1000 * 60 * 60 * 24 * 30 * 6)).toISOString(),
        userId: authFlowAttempt.userId,
        scope: authFlowAttempt.scope,
      };

      await this.sessionRepository.createSession({ session });

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

      const { session } = await this.sessionRepository.getSessionByRefreshToken({ clientId, refreshToken });

      if (new Date(session.refreshTokenExpiresAt).getTime() < Date.now().valueOf()) {
        throw new ForbiddenError("Forbidden");
      }

      const { tokenType, accessToken, expiresIn } = await this.tokenService.generateAccessToken({ clientId, sessionId: session.sessionId, userId: session.userId, scope: session.scope });

      const sessionUpdates: UpdateSessionUpdates = { refreshTokenExpiresAt: new Date(Date.now() + (1000 * 60 * 60 * 24 * 30 * 6)).toISOString() };

      await this.sessionRepository.updateSession({ clientId, sessionId: session.sessionId, updates: sessionUpdates });

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
  getToken(params: GetTokenInput): Promise<GetTokenOutput>;
  deleteSession(params: DeleteSessionInput): Promise<DeleteSessionOutput>;
}

export type AuthServiceConfigInterface = Pick<EnvConfigInterface, "authUI">;

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
  host: string;
  clientId: string;
  responseType: string;
  redirectUri: string;
  state?: string;
  scope?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  identityProvider?: string;
}

export interface BeginAuthFlowOutput {
  location: string;
  cookies: string[];
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

export interface DeleteSessionInput {
  clientId: string;
  refreshToken: string;
}

export type DeleteSessionOutput = void;

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
