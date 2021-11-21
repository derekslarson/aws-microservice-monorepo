import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Crypto, CryptoFactory, ForbiddenError, IdServiceInterface, LoggerServiceInterface, SmsServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MailServiceInterface } from "./mail.service";
import { AuthFlowAttemptRepositoryInterface } from "../repositories/authFlowAttempt.dynamo.repository";
import { Csrf, CsrfFactory } from "../factories/csrf.factory";
import { User, UserRepositoryInterface } from "../repositories/user.dynamo.repository";

@injectable()
export class AuthenticationService implements AuthenticationServiceInterface {
  private crypto: Crypto;

  private csrf: Csrf;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MailServiceInterface) private mailService: MailServiceInterface,
    @inject(TYPES.SmsServiceInterface) private smsService: SmsServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
    @inject(TYPES.AuthFlowAttemptRepositoryInterface) private authFlowAttemptRepository: AuthFlowAttemptRepositoryInterface,
    @inject(TYPES.CryptoFactory) cryptoFactory: CryptoFactory,
    @inject(TYPES.CsrfFactory) csrfFactory: CsrfFactory,
  ) {
    this.crypto = cryptoFactory();
    this.csrf = csrfFactory();
  }

  public async login(params: LoginInput): Promise<LoginOutput> {
    try {
      this.loggerService.trace("login called", { params }, this.constructor.name);

      const { clientId, state } = params;

      const confirmationCode = this.crypto.randomDigits(6).join("");

      const { user } = this.isEmailLoginInput(params)
        ? await this.userRepository.getUserByEmail({ email: params.email })
        : await this.userRepository.getUserByPhone({ phone: params.phone });

      // Verify that auth flow attempt exists so upsert doesn't occur
      await this.authFlowAttemptRepository.getAuthFlowAttempt({ clientId, state });

      await this.authFlowAttemptRepository.updateAuthFlowAttempt({
        clientId,
        state,
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

      const { clientId, state, confirmationCode, xsrfToken } = params;

      const { authFlowAttempt } = await this.authFlowAttemptRepository.getAuthFlowAttempt({ clientId, state });

      const xsrfTokenIsValid = this.csrf.verify(authFlowAttempt.secret, xsrfToken);

      if (!xsrfTokenIsValid || !authFlowAttempt.confirmationCode || confirmationCode !== authFlowAttempt.confirmationCode) {
        throw new ForbiddenError("Forbidden");
      }

      const authorizationCode = this.idService.generateId();

      await this.authFlowAttemptRepository.updateAuthFlowAttempt({
        clientId,
        state,
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
export interface AuthenticationServiceInterface {
  login(params: LoginInput): Promise<LoginOutput>;
  confirm(params: ConfirmInput): Promise<ConfirmOutput>;
}

interface EmailLoginInput {
  email: string;
  clientId: string;
  state: string;
}

interface PhoneLoginInput {
  phone: string;
  clientId: string;
  state: string;
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
