import "reflect-metadata";
import { injectable, inject } from "inversify";
import { AWSError, CognitoIdentityServiceProvider } from "aws-sdk";
import { BadRequestError, HttpRequestServiceInterface, LoggerServiceInterface, SmsServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { CognitoFactory } from "../factories/cognito.factory";
import { MailServiceInterface } from "./mail.service";
import { Crypto, CryptoFactory } from "../factories/crypto.factory";

@injectable()
export class AuthenticationService implements AuthenticationServiceInterface {
  private cognito: CognitoIdentityServiceProvider;

  private crypto: Crypto;

  constructor(
    @inject(TYPES.EnvConfigInterface) private config: AuthenticationServiceConfigInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MailServiceInterface) private mailService: MailServiceInterface,
    @inject(TYPES.SmsServiceInterface) private smsService: SmsServiceInterface,
    @inject(TYPES.HttpRequestServiceInterface) private httpRequestService: HttpRequestServiceInterface,
    @inject(TYPES.CognitoFactory) cognitoFactory: CognitoFactory,
    @inject(TYPES.CryptoFactory) cryptoFactory: CryptoFactory,
  ) {
    this.cognito = cognitoFactory();
    this.crypto = cryptoFactory();
  }

  public async createUser(params: CreateUserInput): Promise<CreateUserOutput> {
    try {
      this.loggerService.trace("createUser called", { params }, this.constructor.name);

      const { id, email, phone } = params;

      const secretHash = this.createUserPoolClientSecretHash(id);

      const signUpParams: CognitoIdentityServiceProvider.Types.SignUpRequest = {
        ClientId: this.config.userPool.yacClientId,
        SecretHash: secretHash,
        Username: id,
        Password: `YAC-${this.config.secret}`,
        UserAttributes: [],
      };

      if (email) {
        signUpParams.UserAttributes?.push({
          Name: "email",
          Value: email,
        },);
      }

      if (phone) {
        signUpParams.UserAttributes?.push({
          Name: "phone_number",
          Value: phone,
        },);
      }

      await this.cognito.signUp(signUpParams).promise();
    } catch (error: unknown) {
      if (this.isAwsError(error) && error.code === "UsernameExistsException") {
        throw new BadRequestError(error.message);
      }

      this.loggerService.error("Error in createUser", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async login(params: LoginInput): Promise<LoginOutput> {
    try {
      this.loggerService.trace("login called", { params }, this.constructor.name);

      const username = this.isEmailLoginInput(params) ? params.email : params.phone;

      const authChallenge = this.crypto.randomDigits(6).join("");

      const updateUserAttributesParams: CognitoIdentityServiceProvider.Types.AdminUpdateUserAttributesRequest = {
        UserAttributes: [
          {
            Name: "custom:authChallenge",
            Value: `${authChallenge},${Math.round((new Date()).valueOf() / 1000)}`,
          },
        ],
        UserPoolId: this.config.userPool.id,
        Username: username,
      };

      await this.cognito.adminUpdateUserAttributes(updateUserAttributesParams).promise();

      const secretHash = this.createUserPoolClientSecretHash(username);

      const initiateAuthParams: CognitoIdentityServiceProvider.Types.AdminInitiateAuthRequest = {
        UserPoolId: this.config.userPool.id,
        ClientId: this.config.userPool.yacClientId,
        AuthFlow: "CUSTOM_AUTH",
        AuthParameters: {
          USERNAME: username,
          SECRET_HASH: secretHash,
        },
      };

      const initiateAuthResponse = await this.cognito.adminInitiateAuth(initiateAuthParams).promise();

      if (!initiateAuthResponse.Session) {
        throw new Error("No session returned from initiateAuth.");
      }

      if (this.isEmailLoginInput(params)) {
        await this.mailService.sendConfirmationCode(params.email, authChallenge);
      } else {
        await this.smsService.publish({ phoneNumber: params.phone, message: `Your Yac login code is ${authChallenge}` });
      }

      return { session: initiateAuthResponse.Session };
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

      const secretHash = this.createUserPoolClientSecretHash(username);

      const respondToAuthChallengeParams: CognitoIdentityServiceProvider.Types.AdminRespondToAuthChallengeRequest = {
        UserPoolId: this.config.userPool.id,
        ClientId: this.config.userPool.yacClientId,
        Session: session,
        ChallengeName: "CUSTOM_CHALLENGE",
        ChallengeResponses: {
          USERNAME: username,
          ANSWER: confirmationCode,
          SECRET_HASH: secretHash,
        },
      };

      const [ { authorizationCode }, { AuthenticationResult, Session } ] = await Promise.all([
        this.getAuthorizationCode({ username, clientId, redirectUri, xsrfToken, state, codeChallengeMethod, codeChallenge, scope }),
        this.cognito.adminRespondToAuthChallenge(respondToAuthChallengeParams).promise(),
      ]);

      if (!AuthenticationResult) {
        return { confirmed: false, session: Session as string };
      }

      return { confirmed: true, authorizationCode };
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async getAuthorizationCode(params: GetAuthorizationCodeInput): Promise<GetAuthorizationCodeOutput> {
    try {
      this.loggerService.trace("getAuthorizationCode called", { params }, this.constructor.name);

      const { username, clientId, redirectUri, xsrfToken, state, codeChallenge, codeChallengeMethod, scope } = params;

      const data = `_csrf=${xsrfToken}&username=${encodeURIComponent(username)}&password=YAC-${this.config.secret}`;

      const queryParameters = {
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
        ...(state && { state }),
        ...(codeChallenge && { code_challenge: codeChallenge }),
        ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod }),
        ...(scope && { scope }),
      };

      const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `XSRF-TOKEN=${xsrfToken}; Path=/; Secure; HttpOnly; SameSite=Lax`,
      };

      const loginResponse = await this.httpRequestService.post(`${this.config.userPool.domain}/login`, data, queryParameters, headers, {
        validateStatus(status: number) {
          return status >= 200 && status < 600;
        },
        maxRedirects: 0,
      });

      const redirectPath = loginResponse.redirect?.path;

      if (!redirectPath) {
        throw new Error("redirect path missing in response");
      }

      const authorizationCode = redirectPath.split("code=")[1]?.split("&")[0];

      if (!authorizationCode) {
        throw new Error("authorizationCode missing in response");
      }

      return { authorizationCode };
    } catch (error: unknown) {
      this.loggerService.error("Error in getAuthorizationCode", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private createUserPoolClientSecretHash(username: string): string {
    try {
      this.loggerService.trace("createUserPoolClientSecretHash called", { username }, this.constructor.name);

      const secretHash = this.crypto.createHmac("SHA256", this.config.userPool.yacClientSecret).update(`${username}${this.config.userPool.yacClientId}`).digest("base64");

      return secretHash;
    } catch (error: unknown) {
      this.loggerService.error("Error in createUserPoolClientSecretHash", { error, username }, this.constructor.name);

      throw error;
    }
  }

  private isAwsError(error: unknown): error is AWSError {
    return (error as AWSError)?.code !== undefined;
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

export type AuthenticationServiceConfigInterface = Pick<EnvConfigInterface, "userPool" | "apiDomain" | "secret">;

export interface AuthenticationServiceInterface {
  createUser(params: CreateUserInput): Promise<CreateUserOutput>;
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

export interface CreateUserInput {
  id: string;
  email?: string;
  phone?: string;
}

export type CreateUserOutput = void;

export interface GetAuthorizationCodeInput {
  username: string;
  clientId: string;
  redirectUri: string;
  xsrfToken: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string;
}

export interface GetAuthorizationCodeOutput {
  authorizationCode: string;
}
