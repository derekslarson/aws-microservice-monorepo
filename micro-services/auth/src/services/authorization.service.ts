/* eslint-disable @typescript-eslint/no-floating-promises */
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { IdServiceInterface, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { AuthFlowAttempt, AuthFlowAttemptRepositoryInterface } from "../repositories/authFlowAttempt.dynamo.repository";
import { Csrf, CsrfFactory } from "../factories/csrf.factory";

@injectable()
export class AuthorizationService implements AuthorizationServiceInterface {
  private csrf: Csrf;

  constructor(
    @inject(TYPES.EnvConfigInterface) private config: AuthorizationServiceConfigInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.AuthFlowAttemptRepositoryInterface) private authFlowAttemptRepository: AuthFlowAttemptRepositoryInterface,
    @inject(TYPES.CsrfFactory) csrfFactory: CsrfFactory,
  ) {
    this.csrf = csrfFactory();
  }

  public async getAuthorizationRedirectData(params: GetAuthorizationRedirectDataInput): Promise<GetAuthorizationRedirectDataOutput> {
    try {
      this.loggerService.trace("getAuthorizationRedirectData called", { params }, this.constructor.name);

      const { host, clientId, state, codeChallenge, codeChallengeMethod, responseType, redirectUri, scope } = params;

      const secret = this.csrf.secretSync();
      const xsrfToken = this.csrf.create(secret);

      const authFlowAttempt: AuthFlowAttempt = {
        clientId,
        state,
        responseType,
        secret,
        codeChallenge,
        codeChallengeMethod,
      };

      await this.authFlowAttemptRepository.createAuthFlowAttempt({ authFlowAttempt });

      const optionalQueryParams = { code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod, scope };
      const optionalQueryString = Object.entries(optionalQueryParams).reduce((acc, [ key, value ]) => (value ? `${acc}&${key}=${value}` : acc), "");

      const location = `${this.config.authUI}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&state=${state}${optionalQueryString}`;
      const xsrfTokenCookie = `XSRF-TOKEN=${xsrfToken}; Path=/; Domain=${host}; Secure; HttpOnly; SameSite=Lax`;

      return { location, cookies: [ xsrfTokenCookie ] };
    } catch (error: unknown) {
      this.loggerService.error("Error in getAuthorizationRedirectData", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export type AuthorizationServiceConfigInterface = Pick<EnvConfigInterface, "apiDomain" | "authUI">;

export interface AuthorizationServiceInterface {
  getAuthorizationRedirectData(params: GetAuthorizationRedirectDataInput): Promise<GetAuthorizationRedirectDataOutput>;
}

export interface GetAuthorizationRedirectDataInput {
  host: string;
  clientId: string;
  responseType: string;
  redirectUri: string;
  state: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope?: string;
  identityProvider?: string;
}

export interface GetAuthorizationRedirectDataOutput {
  location: string;
  cookies: string[];
}
