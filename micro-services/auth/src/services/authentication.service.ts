import "reflect-metadata";
import { injectable, inject } from "inversify";
import { Crypto, CryptoFactory, LoggerServiceInterface, SmsServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MailServiceInterface } from "./mail.service";
import { UserPoolServiceInterface } from "./userPool.service";

@injectable()
export class AuthenticationService implements AuthenticationServiceInterface {
  private crypto: Crypto;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MailServiceInterface) private mailService: MailServiceInterface,
    @inject(TYPES.SmsServiceInterface) private smsService: SmsServiceInterface,
    @inject(TYPES.UserPoolServiceInterface) private userPoolService: UserPoolServiceInterface,
    @inject(TYPES.CryptoFactory) cryptoFactory: CryptoFactory,
  ) {
    this.crypto = cryptoFactory();
  }

  public async login(params: LoginInput): Promise<LoginOutput> {
    try {
      this.loggerService.trace("login called", { params }, this.constructor.name);

      const username = this.isEmailLoginInput(params) ? params.email : params.phone;

      const confirmationCode = this.crypto.randomDigits(6).join("");

      const { session } = await this.userPoolService.initiateCustomAuthFlow({ username, confirmationCode });

      if (this.isEmailLoginInput(params)) {
        await this.mailService.sendConfirmationCode(params.email, confirmationCode);
      } else {
        await this.smsService.publish({ phoneNumber: params.phone, message: `Your Yac login code is ${confirmationCode}` });
      }

      return { session };
    } catch (error: unknown) {
      this.loggerService.error("Error in login", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async confirm(params: ConfirmInput): Promise<ConfirmOutput> {
    try {
      this.loggerService.trace("confirm called", { params }, this.constructor.name);

      const { clientId, session, confirmationCode, redirectUri, xsrfToken, state, codeChallengeMethod, codeChallenge, scope } = params;

      const username = this.isEmailConfirmInput(params) ? params.email : params.phone;

      const [ { authorizationCode }, completeCustomAuthFlowOutput ] = await Promise.all([
        this.userPoolService.completeOAuth2AuthFlow({ username, clientId, redirectUri, xsrfToken, state, codeChallengeMethod, codeChallenge, scope }),
        this.userPoolService.completeCustomAuthFlow({ username, confirmationCode, session }),
      ]);

      if (!completeCustomAuthFlowOutput.success) {
        return { confirmed: false, session: completeCustomAuthFlowOutput.session };
      }

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

  private isEmailConfirmInput(input: ConfirmInput): input is EmailConfirmInput {
    try {
      this.loggerService.trace("isEmailConfirmInput called", { input }, this.constructor.name);

      return "email" in input;
    } catch (error: unknown) {
      this.loggerService.error("Error in isEmailConfirmInput", { error, input }, this.constructor.name);

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
}

interface PhoneLoginInput {
  phone: string;
}

export type LoginInput = EmailLoginInput | PhoneLoginInput;
export interface LoginOutput {
  session: string;
}

export interface BaseConfirmInput {
  clientId: string;
  session: string;
  confirmationCode: string;
  redirectUri: string;
  xsrfToken: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string;
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
