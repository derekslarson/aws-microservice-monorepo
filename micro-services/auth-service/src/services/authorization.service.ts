/* eslint-disable @typescript-eslint/no-floating-promises */
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { HttpRequestServiceInterface, LoggerServiceInterface } from "@yac/core";
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

  public async authorize(params: AuthorizeInput): Promise<AuthorizeOutput> {
    try {
      this.loggerService.trace("authorize called", { params }, this.constructor.name);

      const { clientId, state, codeChallenge, codeChallengeMethod, responseType, redirectUri, scope } = params;

      const authorizeResponse = await this.httpRequestService.get(`${this.config.userPool.domain}/oauth2/authorize`, {
        response_type: responseType,
        client_id: clientId,
        redirect_uri: redirectUri,
        ...(state && { state }),
        ...(codeChallenge && { code_challenge: codeChallenge }),
        ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod }),
        ...(scope && { scope: scope.join("+") }),
      });

      const setCookieHeader = authorizeResponse.headers["set-cookie"];

      if (!Array.isArray(setCookieHeader)) {
        throw new Error("Malformed 'set-cookie' header in response.");
      }

      const [ xsrfTokenHeader ] = setCookieHeader.filter((header: string) => header.substring(0, 10) === "XSRF-TOKEN");

      const xsrfToken = xsrfTokenHeader.split(";")[0].split("=")[1];

      return { xsrfToken };
    } catch (error: unknown) {
      this.loggerService.error("Error in authorize", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export type AuthorizationServiceConfigInterface = Pick<EnvConfigInterface, "userPool" | "apiDomain" | "secret">;

export interface AuthorizationServiceInterface {
  authorize(params: AuthorizeInput): Promise<AuthorizeOutput>;
}

export interface AuthorizeInput {
  clientId: string;
  responseType: string;
  redirectUri: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string[];
}

export interface AuthorizeOutput {
  xsrfToken: string;
}
