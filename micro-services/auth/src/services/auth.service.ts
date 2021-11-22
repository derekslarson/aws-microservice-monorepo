import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Crypto, CryptoFactory, ForbiddenError, IdServiceInterface, LoggerServiceInterface, SmsServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MailServiceInterface } from "./mail.service";
import { AuthFlowAttempt, AuthFlowAttemptRepositoryInterface } from "../repositories/authFlowAttempt.dynamo.repository";
import { Csrf, CsrfFactory } from "../factories/csrf.factory";
import { UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { EnvConfigInterface } from "../config/env.config";
import { TokenServiceInterface } from "./token.service";

@injectable()
export class AuthService implements AuthServiceInterface {
  private crypto: Crypto;

  private csrf: Csrf;

  private authUiUrl: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MailServiceInterface) private mailService: MailServiceInterface,
    @inject(TYPES.SmsServiceInterface) private smsService: SmsServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.TokenServiceInterface) private tokenService: TokenServiceInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
    @inject(TYPES.AuthFlowAttemptRepositoryInterface) private authFlowAttemptRepository: AuthFlowAttemptRepositoryInterface,
    @inject(TYPES.EnvConfigInterface) config: AuthServiceConfigInterface,
    @inject(TYPES.CryptoFactory) cryptoFactory: CryptoFactory,
    @inject(TYPES.CsrfFactory) csrfFactory: CsrfFactory,
  ) {
    this.authUiUrl = config.authUI;
    this.crypto = cryptoFactory();
    this.csrf = csrfFactory();
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

      const confirmationCode = this.crypto.randomDigits(6).join("");

      const { user } = this.isEmailLoginInput(params)
        ? await this.userRepository.getUserByEmail({ email: params.email })
        : await this.userRepository.getUserByPhone({ phone: params.phone });

      // Verify that auth flow attempt exists so upsert doesn't occur
      await this.authFlowAttemptRepository.getAuthFlowAttempt({ clientId, xsrfToken });

      await this.authFlowAttemptRepository.updateAuthFlowAttempt({
        clientId,
        xsrfToken,
        updates: {
          userId: user.id,
          confirmationCode,
          confirmationCodeCreatedAt: new Date().toISOString(),
        },
      });

      if (this.isEmailLoginInput(params)) {
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

      const secret = state || this.csrf.secretSync();
      const xsrfToken = this.csrf.create(secret);

      const authFlowAttempt: AuthFlowAttempt = {
        clientId,
        xsrfToken,
        secret,
        responseType,
        state,
        codeChallenge,
        codeChallengeMethod,
      };

      await this.authFlowAttemptRepository.createAuthFlowAttempt({ authFlowAttempt });

      const optionalQueryParams = { code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod, scope };
      const optionalQueryString = Object.entries(optionalQueryParams).reduce((acc, [ key, value ]) => (value ? `${acc}&${key}=${value}` : acc), "");

      const location = `${this.authUiUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&state=${state || secret}${optionalQueryString}`;
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

      const { clientId, authorizationCode, scope } = params;

      const { authFlowAttempt } = await this.authFlowAttemptRepository.getAuthFlowAttemptByAuthorizationCode({ clientId, authorizationCode });

      if (!authFlowAttempt.userId) {
        throw new Error("Malformed Auth Flow Attempt.");
      }

      const { accessToken } = await this.tokenService.generateAccessToken({ clientId, userId: authFlowAttempt.userId, scope: scope || "" });

      await this.authFlowAttemptRepository.deleteAuthFlowAttempt({ clientId, xsrfToken: authFlowAttempt.xsrfToken });

      return { accessToken, refreshToken: "" };
    } catch (error: unknown) {
      this.loggerService.error("Error in getToken", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private isEmailLoginInput(input: LoginInput): input is EmailLoginInput {
    try {
      this.loggerService.trace("isEmailLoginInput called", { input }, this.constructor.name);

      return "email" in input;
    } catch (error: unknown) {
      this.loggerService.error("Error in isEmailLoginInput", { error, input }, this.constructor.name);

      throw error;
    }
  }
}

export interface AuthServiceInterface {
  login(params: LoginInput): Promise<LoginOutput>;
  confirm(params: ConfirmInput): Promise<ConfirmOutput>;
  beginAuthFlow(params: BeginAuthFlowInput): Promise<BeginAuthFlowOutput>;
  getToken(params: GetTokenInput): Promise<GetTokenOutput>;
}

export type AuthServiceConfigInterface = Pick<EnvConfigInterface, "authUI">;

interface BaseLoginInput {
  clientId: string;
  state: string;
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
  state: string;
  confirmationCode: string;
  redirectUri: string;
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
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string;
  identityProvider?: string;
}

export interface BeginAuthFlowOutput {
  location: string;
  cookies: string[];
}

export interface GetTokenInput {
  clientId: string;
  grantType: string;
  redirectUri: string;
  authorizationCode: string;
  codeVerifier?: string;
  scope?: string;
}

export interface GetTokenOutput {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
}
