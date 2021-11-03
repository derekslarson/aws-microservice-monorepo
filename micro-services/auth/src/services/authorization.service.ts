/* eslint-disable @typescript-eslint/no-floating-promises */
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { HttpRequestServiceInterface, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class AuthorizationService implements AuthorizationServiceInterface {
  constructor(
    @inject(TYPES.EnvConfigInterface) private config: AuthorizationServiceConfigInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.HttpRequestServiceInterface) private httpRequestService: HttpRequestServiceInterface,
  ) {
  }

  public async getXsrfToken(params: GetXsrfTokenInput): Promise<GetXsrfTokenOutput> {
    try {
      this.loggerService.trace("getXsrfToken called", { params }, this.constructor.name);

      const { clientId, state, codeChallenge, codeChallengeMethod, responseType, redirectUri, scope } = params;

      const authorizeResponse = await this.httpRequestService.get(`${this.config.userPool.domain}/oauth2/authorize`, {
        response_type: responseType,
        client_id: clientId,
        redirect_uri: redirectUri,
        ...(state && { state }),
        ...(codeChallenge && { code_challenge: codeChallenge }),
        ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod }),
        ...(scope && { scope }),
      });

      const setCookieHeader = authorizeResponse.headers["set-cookie"];

      if (!Array.isArray(setCookieHeader)) {
        throw new Error("Malformed 'set-cookie' header in response.");
      }

      const [ xsrfTokenHeader ] = setCookieHeader.filter((header: string) => header.substring(0, 10) === "XSRF-TOKEN");

      const xsrfToken = xsrfTokenHeader.split(";")[0].split("=")[1];

      return { xsrfToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in getXsrfToken", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGoogleSigninRedirectData(params: GetGoogleSigninRedirectDataInput): Promise<GetGoogleSigninRedirectDataOutput> {
    try {
      this.loggerService.trace("getGoogleSigninRedirectData called", { params }, this.constructor.name);

      const { clientId, state, codeChallenge, codeChallengeMethod, responseType, redirectUri, scope } = params;

      const authorizeResponse = await this.httpRequestService.get(`${this.config.userPool.domain}/oauth2/authorize`, {
        response_type: responseType,
        client_id: clientId,
        redirect_uri: redirectUri,
        identity_provider: "Google",
        ...(state && { state }),
        ...(codeChallenge && { code_challenge: codeChallenge }),
        ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod }),
        ...(scope && { scope }),
      }, {}, { maxRedirects: 0, validateStatus: (status) => status === 302 });

      const { location } = authorizeResponse.headers;
      const cookies = authorizeResponse.headers["set-cookie"];

      if (typeof location !== "string") {
        throw new Error("Malformed 'location' header in response.");
      }

      if (!Array.isArray(cookies)) {
        throw new Error("Malformed 'set-cookie' header in response.");
      }

      const locationWithAccessType = `${location}&access_type=offline`;

      return { location: locationWithAccessType, cookies };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGoogleSigninRedirectData", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export type AuthorizationServiceConfigInterface = Pick<EnvConfigInterface, "userPool" | "apiDomain">;

export interface AuthorizationServiceInterface {
  getXsrfToken(params: GetXsrfTokenInput): Promise<GetXsrfTokenOutput>;
  getGoogleSigninRedirectData(params: GetGoogleSigninRedirectDataInput): Promise<GetGoogleSigninRedirectDataOutput>;
}

export interface GetXsrfTokenInput {
  clientId: string;
  responseType: string;
  redirectUri: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string;
}

export interface GetXsrfTokenOutput {
  xsrfToken: string;
}

export interface GetGoogleSigninRedirectDataInput {
  clientId: string;
  responseType: string;
  redirectUri: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string;
}

export interface GetGoogleSigninRedirectDataOutput {
  location: string;
  cookies: string[];
}
