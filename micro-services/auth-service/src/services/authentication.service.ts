import "reflect-metadata";
import { injectable, inject } from "inversify";
import { AWSError, CognitoIdentityServiceProvider } from "aws-sdk";
import { BadRequestError, HttpRequestServiceInterface, LoggerServiceInterface, SmsServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { CognitoFactory } from "../factories/cognito.factory";
import { MailServiceInterface } from "./mail.service";
import { Crypto, CryptoFactory } from "../factories/crypto.factory";
import { LoginInputDto } from "../models/login/login.input.model";
import { ConfirmationInput } from "../models/confirmation/confirmation.input.model";

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

  public async login(loginInput: LoginInputDto): Promise<{ session: string; }> {
    try {
      this.loggerService.trace("login called", { loginInput }, this.constructor.name);

      const { email, phone } = loginInput;

      if (!email && !phone) {
        throw new BadRequestError("'email' or 'phone' are required");
      }

      const username = email || phone;

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

      if (email) {
        await this.mailService.sendConfirmationCode(loginInput.email, authChallenge);
      } else {
        await this.smsService.publish({ phoneNumber: phone, message: `Your Yac login code is ${authChallenge}` });
      }

      return { session: initiateAuthResponse.Session };
    } catch (error: unknown) {
      this.loggerService.error("Error in login", { error, loginInput }, this.constructor.name);

      throw error;
    }
  }

  public async confirm(confirmationInput: ConfirmationInput): Promise<{ confirmed: boolean; session?: string; authorizationCode?: string }> {
    try {
      this.loggerService.trace("confirm called", { confirmationInput }, this.constructor.name);

      const { email, phone } = confirmationInput;

      if (!email && !phone) {
        throw new BadRequestError("'email' or 'phone' are required");
      }

      const username = email || phone;

      const secretHash = this.createUserPoolClientSecretHash(username);

      const respondToAuthChallengeParams: CognitoIdentityServiceProvider.Types.AdminRespondToAuthChallengeRequest = {
        UserPoolId: this.config.userPool.id,
        ClientId: this.config.userPool.yacClientId,
        Session: confirmationInput.session,
        ChallengeName: "CUSTOM_CHALLENGE",
        ChallengeResponses: {
          USERNAME: username,
          ANSWER: confirmationInput.confirmationCode,
          SECRET_HASH: secretHash,
        },
      };

      const [ authorizationCode, respondToAuthChallengeResponse ] = await Promise.all([
        this.getAuthorizationCode(username, confirmationInput.clientId, confirmationInput.redirectUri, confirmationInput.xsrfToken),
        this.cognito.adminRespondToAuthChallenge(respondToAuthChallengeParams).promise(),
      ]);

      if (!respondToAuthChallengeResponse.AuthenticationResult) {
        return { confirmed: false, session: respondToAuthChallengeResponse.Session as string };
      }

      return { confirmed: true, authorizationCode };
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, confirmationInput }, this.constructor.name);

      throw error;
    }
  }

  public async getXsrfToken(clientId: string, redirectUri: string): Promise<{ xsrfToken: string }> {
    try {
      this.loggerService.trace("getXsrfToken called", { clientId, redirectUri }, this.constructor.name);

      const queryParameters = {
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
      };

      const authorizeResponse = await this.httpRequestService.get(`${this.config.userPool.domain}/oauth2/authorize`, queryParameters);

      const setCookieHeader = authorizeResponse.headers["set-cookie"];

      if (!Array.isArray(setCookieHeader)) {
        throw new Error("Malformed 'set-cookie' header in response.");
      }

      const [ xsrfTokenHeader ] = setCookieHeader.filter((header: string) => header.substring(0, 10) === "XSRF-TOKEN");

      const xsrfToken = xsrfTokenHeader.split(";")[0].split("=")[1];

      return { xsrfToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in getXsrfToken", { error, clientId, redirectUri }, this.constructor.name);

      throw error;
    }
  }

  private async getAuthorizationCode(username: string, clientId: string, redirectUri: string, xsrfToken: string): Promise<string> {
    try {
      this.loggerService.trace("getAuthorizationCode called", { username, clientId, redirectUri, xsrfToken }, this.constructor.name);

      const data = `_csrf=${xsrfToken}&username=${encodeURIComponent(username)}&password=YAC-${this.config.secret}`;

      const queryParameters = {
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
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

      const [ , authorizationCode ] = redirectPath.split("=");

      return authorizationCode;
    } catch (error: unknown) {
      this.loggerService.error("Error in getAuthorizationCode", { error, username, clientId, redirectUri, xsrfToken }, this.constructor.name);

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
}

export type AuthenticationServiceConfigInterface = Pick<EnvConfigInterface, "userPool" | "apiDomain" | "secret">;

export interface AuthenticationServiceInterface {
  createUser(params: CreateUserInput): Promise<CreateUserOutput>;
  login(loginInput: LoginInputDto): Promise<{ session: string; }>;
  confirm(confirmationInput: ConfirmationInput): Promise<{ confirmed: boolean; session?: string; authorizationCode?: string }>;
  getXsrfToken(clientId: string, redirectUri: string): Promise<{ xsrfToken: string }>;
}

export interface CreateUserInput {
  id: string;
  email?: string;
  phone?: string;
}

export type CreateUserOutput = void;
