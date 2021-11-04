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
  ) {}

  public async getAuthorizationRedirectData(params: GetAuthorizationRedirectDataInput): Promise<GetAuthorizationRedirectDataOutput> {
    try {
      this.loggerService.trace("getAuthorizationRedirectData called", { params }, this.constructor.name);

      const { host, clientId, state, codeChallenge, codeChallengeMethod, responseType, redirectUri, scope, identityProvider } = params;

      const optionalQueryParams = { code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod, state, scope };
      const optionalQueryString = Object.entries(optionalQueryParams).reduce((acc, [ key, value ]) => (value ? `${acc}&${key}=${value}` : acc), "");

      if (identityProvider) {
        const location = `${this.config.userPool.domain}/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&identity_provider=${identityProvider}&response_type=${responseType}${optionalQueryString}`;

        return { location, cookies: [] };
      }

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

      const location = `${this.config.authUI}?client_id=${clientId}&redirect_uri=${redirectUri}${optionalQueryString}`;
      const xsrfTokenCookie = `XSRF-TOKEN=${xsrfToken}; Path=/; Domain=${host}; Secure; HttpOnly; SameSite=Lax`;

      return { location, cookies: [ xsrfTokenCookie ] };
    } catch (error: unknown) {
      this.loggerService.error("Error in getAuthorizationRedirectData", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export type AuthorizationServiceConfigInterface = Pick<EnvConfigInterface, "userPool" | "apiDomain" | "authUI">;

export interface AuthorizationServiceInterface {
  getAuthorizationRedirectData(params: GetAuthorizationRedirectDataInput): Promise<GetAuthorizationRedirectDataOutput>;
}

export interface GetAuthorizationRedirectDataInput {
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

export interface GetAuthorizationRedirectDataOutput {
  location: string;
  cookies: string[];
}
