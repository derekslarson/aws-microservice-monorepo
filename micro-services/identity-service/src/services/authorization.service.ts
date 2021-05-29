// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, HttpRequestServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class AuthorizationService implements AuthorizationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.HttpRequestServiceInterface) private httpRequestService: HttpRequestServiceInterface,
    @inject(TYPES.EnvConfigInterface) private config: AuthorizationServiceEnvConfigInterfce,
  ) { }

  public async getTokens(authorizationCode: string): Promise<{ accessToken: string; refreshToken: string; }> {
    try {
      this.loggerService.trace("getTokens called", { authorizationCode }, this.constructor.name);

      const oauth2AuthorizeBody = `grant_type=authorization_code&code=${authorizationCode}&client_id=${this.config.userPoolClientId}&redirect_uri=${this.config.userPoolClientRedirectUri}`;

      const oauth2AuthorizeHeaders = {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${this.config.userPoolClientId}:${this.config.userPoolClientSecret}`).toString("base64")}`,
      };

      const tokenResponse = await this.httpRequestService.post<{ accessToken: string; refreshToken: string; }>(`${this.config.authServiceDomain}/oauth2/token`, oauth2AuthorizeBody, {}, oauth2AuthorizeHeaders);

      return tokenResponse.body;
    } catch (error: unknown) {
      this.loggerService.error("Error in getTokens", { error, authorizationCode }, this.constructor.name);

      throw error;
    }
  }
}

type AuthorizationServiceEnvConfigInterfce = Pick<EnvConfigInterface, "userPoolClientId" | "userPoolClientSecret" | "userPoolClientRedirectUri" | "authServiceDomain">;

export interface AuthorizationServiceInterface {
  getTokens(authorizationCode: string): Promise<{ accessToken: string; refreshToken: string; }>;
}
