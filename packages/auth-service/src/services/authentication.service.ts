/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { CognitoIdentityServiceProvider } from "aws-sdk";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "./logger.service";
import { SignUpInput } from "../models/sign-up/signUp.input.model";
import { EnvConfigInterface } from "../config/env.config";
import { CognitoFactory } from "../factories/cognito.factory";
import { LoginInput } from "../models/login/login.input.model";
import { ConfirmationInput } from "../models/confirmation/confirmation.input.model";
import { MailServiceInterface } from "./mail.service";
import { Crypto, CryptoFactory } from "../factories/crypto.factory";
import { Axios, AxiosFactory } from "../factories/axios.factory";

@injectable()
export class AuthenticationService implements AuthenticationServiceInterface {
  private cognito: CognitoIdentityServiceProvider;

  private crypto: Crypto;

  private axios: Axios;

  constructor(
    @inject(TYPES.EnvConfigInterface) private config: AuthenticationServiceConfigInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MailServiceInterface) private mailService: MailServiceInterface,
    @inject(TYPES.CognitoFactory) cognitoFactory: CognitoFactory,
    @inject(TYPES.CryptoFactory) cryptoFactory: CryptoFactory,
    @inject(TYPES.AxiosFactory) axiosFactory: AxiosFactory,
  ) {
    this.axios = axiosFactory();
    this.cognito = cognitoFactory();
    this.crypto = cryptoFactory();
  }

  public async signUp(signUpInput: SignUpInput): Promise<void> {
    try {
      this.loggerService.trace("signUp called", { signUpInput }, this.constructor.name);

      const secretHash = this.createUserPoolClientSecretHash(signUpInput.email);

      const signUpParams: CognitoIdentityServiceProvider.Types.SignUpRequest = {
        ClientId: this.config.userPool.clientId,
        SecretHash: secretHash,
        Username: signUpInput.email,
        Password: this.config.secret,
      };

      await this.cognito.signUp(signUpParams).promise();

      await this.login({ email: signUpInput.email });
    } catch (error: unknown) {
      this.loggerService.error("Error in signUp", { error, signUpInput }, this.constructor.name);

      throw error;
    }
  }

  public async login(loginInput: LoginInput): Promise<void> {
    try {
      this.loggerService.trace("login called", { loginInput }, this.constructor.name);

      const authChallenge = this.crypto.randomDigits(6).join("");

      const updateUserAttributesParams: CognitoIdentityServiceProvider.Types.AdminUpdateUserAttributesRequest = {
        UserAttributes: [
          {
            Name: "custom:authChallenge",
            Value: `${authChallenge},${Math.round((new Date()).valueOf() / 1000)}`,
          },
        ],
        UserPoolId: this.config.userPool.id,
        Username: loginInput.email,
      };

      await this.cognito.adminUpdateUserAttributes(updateUserAttributesParams).promise();

      const magicLink = `${this.config.apiDomain}/confirm?email=${loginInput.email}&confirmationCode=${authChallenge}`;

      await this.mailService.sendMagicLink(loginInput.email, magicLink);
    } catch (error: unknown) {
      this.loggerService.error("Error in login", { error, loginInput }, this.constructor.name);

      throw error;
    }
  }

  public async confirm(confirmationInput: ConfirmationInput): Promise<any> {
    try {
      this.loggerService.trace("confirm called", { confirmationInput }, this.constructor.name);

      const secretHash = this.createUserPoolClientSecretHash(confirmationInput.email);

      const initiateAuthParams: CognitoIdentityServiceProvider.Types.InitiateAuthRequest = {
        ClientId: this.config.userPool.clientId,
        AuthFlow: "CUSTOM_AUTH",
        AuthParameters: {
          USERNAME: confirmationInput.email,
          SECRET_HASH: secretHash,
        },
      };

      const initiateAuthResponse = await this.cognito.initiateAuth(initiateAuthParams).promise();

      const respondToAuthChallengeParams: CognitoIdentityServiceProvider.Types.RespondToAuthChallengeRequest = {
        ClientId: this.config.userPool.clientId,
        Session: initiateAuthResponse.Session,
        ChallengeName: "CUSTOM_CHALLENGE",
        ChallengeResponses: {
          USERNAME: confirmationInput.email,
          ANSWER: confirmationInput.confirmationCode,
          SECRET_HASH: secretHash,
        },
      };

      const respondToAuthChallengeResponse = await this.cognito.respondToAuthChallenge(respondToAuthChallengeParams).promise();

      const oauthResponse = await this.getOauth2Token();

      return { respondToAuthChallengeResponse, oauthResponse };
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, confirmationInput }, this.constructor.name);

      throw error;
    }
  }

  private async getOauth2Token(scopes: string[] = []): Promise<any> {
    try {
      this.loggerService.trace("getOauth2Token called", { scopes }, this.constructor.name);

      const data = `grant_type=client_credentials&scope=${scopes.join(" ")}`;

      const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.config.userPool.clientId}:${this.config.userPool.clientSecret}`).toString("base64")}`,
      };

      const { data: response } = await this.axios.post(`${this.config.userPool.domain}/oauth2/token`, data, { headers });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return response;
    } catch (error: unknown) {
      this.loggerService.error("Error in getOauth2Token", { error, scopes }, this.constructor.name);

      throw error;
    }
  }

  private createUserPoolClientSecretHash(username: string): string {
    try {
      this.loggerService.trace("createUserPoolClientSecretHash called", { username }, this.constructor.name);

      const secretHash = this.crypto.createHmac("SHA256", this.config.userPool.clientSecret)
        .update(`${username}${this.config.userPool.clientId}`)
        .digest("base64");

      return secretHash;
    } catch (error: unknown) {
      this.loggerService.error("Error in createUserPoolClientSecretHash", { error, username }, this.constructor.name);

      throw error;
    }
  }
}

export type AuthenticationServiceConfigInterface = Pick<EnvConfigInterface, "userPool" | "apiDomain" | "secret">;

export interface AuthenticationServiceInterface {
  signUp(signUpInput: SignUpInput): Promise<void>;
  login(loginInput: LoginInput): Promise<void>;
  confirm(confirmationInput: ConfirmationInput): Promise<any>
}
