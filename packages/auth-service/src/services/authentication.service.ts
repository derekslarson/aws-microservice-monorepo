/* eslint-disable */
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { CognitoIdentityServiceProvider } from "aws-sdk";
import { axiosFactory, HttpRequestServiceInterface, LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { CognitoFactory } from "../factories/cognito.factory";
import { MailServiceInterface } from "./mail.service";
import { Crypto, CryptoFactory } from "../factories/crypto.factory";
import { SignUpInputDto } from "../models/sign-up/signUp.input.model";
import { LoginInputDto } from "../models/login/login.input.model";
import { ConfirmationInputDto } from "../models/confirmation/confirmation.input.model";
import { ClientServiceInterface } from "./client.service";

@injectable()
export class AuthenticationService implements AuthenticationServiceInterface {
  private cognito: CognitoIdentityServiceProvider;

  private crypto: Crypto;

  constructor(
    @inject(TYPES.EnvConfigInterface) private config: AuthenticationServiceConfigInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MailServiceInterface) private mailService: MailServiceInterface,
    @inject(TYPES.ClientServiceInterface) private clientService: ClientServiceInterface,
    @inject(TYPES.HttpRequestServiceInterface) private httpRequestService: HttpRequestServiceInterface,
    @inject(TYPES.CognitoFactory) cognitoFactory: CognitoFactory,
    @inject(TYPES.CryptoFactory) cryptoFactory: CryptoFactory,
  ) {
    this.cognito = cognitoFactory();
    this.crypto = cryptoFactory();
  }

  public async signUp(signUpInput: SignUpInputDto): Promise<void> {
    try {
      this.loggerService.trace("signUp called", { signUpInput }, this.constructor.name);

      const client = await this.clientService.getClient(signUpInput.clientId);

      const secretHash = this.createUserPoolClientSecretHash(signUpInput.email, signUpInput.clientId, client.secret);

      const signUpParams: CognitoIdentityServiceProvider.Types.SignUpRequest = {
        ClientId: signUpInput.clientId,
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

      await this.mailService.sendConfirmationCode(loginInput.email, authChallenge);
    } catch (error: unknown) {
      this.loggerService.error("Error in login", { error, loginInput }, this.constructor.name);

      throw error;
    }
  }

  public async confirm(confirmationInput: ConfirmationInputDto): Promise<{ authorizationCode: string }> {
    try {
      this.loggerService.trace("confirm called", { confirmationInput }, this.constructor.name);

      const client = await this.clientService.getClient(confirmationInput.clientId);

      const secretHash = this.createUserPoolClientSecretHash(confirmationInput.email, confirmationInput.clientId, client.secret);

      const initiateAuthParams: CognitoIdentityServiceProvider.Types.InitiateAuthRequest = {
        ClientId: confirmationInput.clientId,
        AuthFlow: "CUSTOM_AUTH",
        AuthParameters: {
          USERNAME: confirmationInput.email,
          SECRET_HASH: secretHash,
        },
      };

      const initiateAuthResponse = await this.cognito.initiateAuth(initiateAuthParams).promise();

      const respondToAuthChallengeParams: CognitoIdentityServiceProvider.Types.RespondToAuthChallengeRequest = {
        ClientId: confirmationInput.clientId,
        Session: initiateAuthResponse.Session,
        ChallengeName: "CUSTOM_CHALLENGE",
        ChallengeResponses: {
          USERNAME: confirmationInput.email,
          ANSWER: confirmationInput.confirmationCode,
          SECRET_HASH: secretHash,
        },
      };

      await this.cognito.respondToAuthChallenge(respondToAuthChallengeParams).promise();

      const authorizationCode = await this.getAuthorizationCode(confirmationInput.email, confirmationInput.clientId, confirmationInput.redirectUri, confirmationInput.xsrfToken);

      return { authorizationCode };
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, confirmationInput }, this.constructor.name);

      throw error;
    }
  }

  private async getAuthorizationCode(username: string, clientId: string, redirectUri: string, xsrfToken: string): Promise<string> {
    try {
      this.loggerService.trace("getAuthorizationCode called", { username, clientId, redirectUri, xsrfToken }, this.constructor.name);

      const data = `_csrf=${xsrfToken}&username=${username}&password=${this.config.secret}`;

      const queryParameters = {
        response_type: "code",
        client_id: clientId,
        redirect_uri: redirectUri,
      };

      const headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `XSRF-TOKEN=${xsrfToken}; Path=/; Secure; HttpOnly; SameSite=Lax`,
      };

      const loginResponse = await this.httpRequestService.post(`${this.config.userPool.domain}/login`, data, queryParameters, headers);

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

  private createUserPoolClientSecretHash(username: string, clientId: string, clientSecret: string): string {
    try {
      this.loggerService.trace("createUserPoolClientSecretHash called", { username, clientId, clientSecret }, this.constructor.name);

      const secretHash = this.crypto.createHmac("SHA256", clientSecret).update(`${username}${clientId}`).digest("base64");

      return secretHash;
    } catch (error: unknown) {
      this.loggerService.error("Error in createUserPoolClientSecretHash", { error, username, clientId, clientSecret }, this.constructor.name);

      throw error;
    }
  }

  // private async getXsrfToken(clientId: string, redirectUri: string): Promise<string> {
  //   try {
  //     this.loggerService.trace("getXsrfToken called", { clientId, redirectUri }, this.constructor.name);

  //     const queryParameters = {
  //       response_type: "code",
  //       client_id: clientId,
  //       redirect_uri: redirectUri,
  //     };

  //     const authorizeResponse = await this.httpRequestService.get(`${this.config.userPool.domain}/oauth2/authorize`, queryParameters);

  //     const setCookieHeader = authorizeResponse.headers["set-cookie"];

  //     if (!Array.isArray(setCookieHeader)) {
  //       throw new Error("Malformed 'set-cookie' header in response.");
  //     }

  //     const [ xsrfTokenHeader ] = setCookieHeader.filter((header: string) => header.substring(0, 10) === "XSRF-TOKEN");

  //     const xsrfToken = xsrfTokenHeader.split(";")[0].split("=")[1];

  //     return xsrfToken;
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getXsrfToken", { error, clientId, redirectUri }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // private async getAccessToken(authorizationCode: string, clientId: string, clientSecret: string, redirectUri: string, username: string, scopes: string[] = []): Promise<string> {
  //   try {
  //     this.loggerService.trace("getAccessToken called", { username }, this.constructor.name);

  //     const data = `grant_type=authorization_code&code=${authorizationCode}&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join(" ")}`;

  //     const headers = {
  //       "Content-Type": "application/x-www-form-urlencoded",
  //       Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
  //     };

  //     const tokenResponse = await this.httpRequestService.post<{ access_token: string }>(`${this.config.userPool.domain}/oauth2/token`, data, {}, headers);

  //     return tokenResponse.body.access_token;
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getAccessToken", { error, username }, this.constructor.name);

  //     throw error;
  //   }
  // }
}

export type AuthenticationServiceConfigInterface = Pick<EnvConfigInterface, "userPool" | "apiDomain" | "secret">;

export interface AuthenticationServiceInterface {
  signUp(signUpInput: SignUpInputDto): Promise<void>;
  login(loginInput: LoginInputDto): Promise<void>;
  confirm(confirmationInput: ConfirmationInputDto): Promise<{ authorizationCode: string }>
}

async function getXsrfToken(domain: string, clientId: string, clientRedirectUri: string): Promise<string> {
  try {
    const axios = axiosFactory();

    const authorizeResponse = await axios.request({
      baseURL: domain,
      url: `/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${clientRedirectUri}`,
      method: "GET",
    });

    const setCookieHeader = (authorizeResponse.headers as Record<string, string[]>)["set-cookie"];

    const [ xsrfTokenHeader ] = setCookieHeader.filter((header: string) => header.substring(0, 10) === "XSRF-TOKEN");

    const xsrfToken = xsrfTokenHeader.split(";")[0].split("=")[1];

    console.log("xsrfToken: ", xsrfToken);

    return xsrfToken;
  } catch (error: unknown) {
    console.log("Error:\n", error);

    throw error;
  }
}

// async function getAccessToken(authorizationCode: string, clientId: string, clientSecret: string, redirectUri: string, scopes: string[] = []): Promise<string> {
//   try {
//     const axios = axiosFactory();

//     const data = `grant_type=authorization_code&code=${authorizationCode}&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes.join(" ")}`;

//     const headers = {
//       "Content-Type": "application/x-www-form-urlencoded",
//       Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
//     };

//     const tokenResponse = await axios.request<{ access_token: string }>({
//       headers,
//       baseURL: "https://yac-auth-service.auth.us-east-2.amazoncognito.com",
//       url: "/oauth2/token",
//       data,
//       method: "POST",
//     });

//     console.log(tokenResponse.data);
//     return tokenResponse.data.access_token;
//   } catch (error: unknown) {
//     console.log("Error:\n", error);

//     throw error;
//   }
// }

getXsrfToken("https://yac-auth-service.auth.us-east-2.amazoncognito.com", "2dej3es0t3p2ok7gq9sbapkc4j", "https://example.com")