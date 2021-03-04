import "reflect-metadata";
import { injectable, inject } from "inversify";
import { CognitoIdentityServiceProvider } from "aws-sdk";
import { Axios, AxiosFactory, LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { CognitoFactory } from "../factories/cognito.factory";
import { MailServiceInterface } from "./mail.service";
import { Crypto, CryptoFactory } from "../factories/crypto.factory";
import { SignUpInputDto } from "../models/sign-up/signUp.input.model";
import { LoginInputDto } from "../models/login/login.input.model";
import { ConfirmationInputDto } from "../models/confirmation/confirmation.input.model";

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

  public async signUp(signUpInput: SignUpInputDto): Promise<void> {
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

  public async login(loginInput: LoginInputDto): Promise<void> {
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

  public async confirm(confirmationInput: ConfirmationInputDto): Promise<{ accessToken: string }> {
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

      await this.cognito.respondToAuthChallenge(respondToAuthChallengeParams).promise();

      const accessToken = await this.getAccessToken(confirmationInput.email);

      return { accessToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, confirmationInput }, this.constructor.name);

      throw error;
    }
  }

  private async getXsrfToken(): Promise<string> {
    try {
      this.loggerService.trace("getXsrfToken called", {}, this.constructor.name);

      const authorizeResponse = await this.axios.request({
        baseURL: this.config.userPool.domain,
        url: `/oauth2/authorize?response_type=code&client_id=${this.config.userPool.clientId}&redirect_uri=${this.config.userPool.clientRedirectUri}`,
        method: "GET",
      });

      const setCookieHeader = (authorizeResponse.headers as Record<string, string[]>)["set-cookie"];

      const [ xsrfToken ] = setCookieHeader.filter((header: string) => header.substring(0, 10) === "XSRF-TOKEN");

      return xsrfToken;
    } catch (error: unknown) {
      this.loggerService.error("Error in getXsrfToken", { error }, this.constructor.name);

      throw error;
    }
  }

  private async getAuthorizationCode(username: string, xsrfToken: string): Promise<string> {
    try {
      this.loggerService.trace("getAuthorizationCode called", { username, xsrfToken }, this.constructor.name);

      const csrf = xsrfToken.split(";")[0].split("=")[1];

      const data = `_csrf=${csrf}&username=${username}&password=${this.config.secret}`;

      const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: xsrfToken,
      };

      const loginResponse = await this.axios.request({
        headers,
        baseURL: this.config.userPool.domain,
        url: `/login?response_type=code&client_id=${this.config.userPool.clientId}&redirect_uri=${this.config.userPool.clientRedirectUri}`,
        data,
        method: "POST",
      });

      const redirectPath = (loginResponse.request as { path: string }).path;

      const [ , authorizationCode ] = redirectPath.split("=");

      return authorizationCode;
    } catch (error: unknown) {
      this.loggerService.error("Error in getAuthorizationCode", { error, username, xsrfToken }, this.constructor.name);

      throw error;
    }
  }

  private async getAccessToken(username: string, scopes: string[] = []): Promise<string> {
    try {
      this.loggerService.trace("getAccessToken called", { username }, this.constructor.name);

      const xsrfToken = await this.getXsrfToken();

      const authorizationCode = await this.getAuthorizationCode(username, xsrfToken);

      const data = `grant_type=authorization_code&code=${authorizationCode}&client_id=${this.config.userPool.clientId}&redirect_uri=${this.config.userPool.clientRedirectUri}&scope=${scopes.join(" ")}`;

      const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.config.userPool.clientId}:${this.config.userPool.clientSecret}`).toString("base64")}`,
      };

      const tokenResponse = await this.axios.request<{ access_token: string }>({
        headers,
        baseURL: this.config.userPool.domain,
        url: "/oauth2/token",
        data,
        method: "POST",
      });

      return tokenResponse.data.access_token;
    } catch (error: unknown) {
      this.loggerService.error("Error in getAccessToken", { error, username }, this.constructor.name);

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
  signUp(signUpInput: SignUpInputDto): Promise<void>;
  login(loginInput: LoginInputDto): Promise<void>;
  confirm(confirmationInput: ConfirmationInputDto): Promise<{ accessToken: string }>
}
