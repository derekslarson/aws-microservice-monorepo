// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import {
  LoggerServiceInterface,
  HttpRequestServiceInterface,
  AuthServiceLoginResponseBody,
  AuthServiceLoginRequestBody,
  AuthServiceConfirmationResponseBody,
  AuthServiceConfirmationRequestBody,
  AuthServiceOauth2AuthorizeRequestQueryParameters,
} from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { LoginInputDto } from "../models/login/login.input.model";
import { ConfirmationInputDto } from "../models/confirmation/confirmation.input.model";

@injectable()
export class AuthenticationService implements AuthenticationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.HttpRequestServiceInterface) private httpRequestService: HttpRequestServiceInterface,
    @inject(TYPES.EnvConfigInterface) private config: AuthenticationServiceEnvConfigType,
  ) {}

  public async login(loginInput: LoginInputDto): Promise<AuthServiceLoginResponseBody> {
    try {
      this.loggerService.trace("login called", { loginInput }, this.constructor.name);

      const body: AuthServiceLoginRequestBody = { email: loginInput.email };

      const response = await this.httpRequestService.post<AuthServiceLoginResponseBody>(`${this.config.authServiceDomain}/login`, body);

      return response.body;
    } catch (error: unknown) {
      this.loggerService.error("Error in login", { error, loginInput }, this.constructor.name);

      throw error;
    }
  }

  public async confirm(confirmInput: ConfirmationInputDto): Promise<AuthServiceConfirmationResponseBody> {
    try {
      this.loggerService.trace("confirm called", { confirmInput }, this.constructor.name);

      const authorizeQueryParams: AuthServiceOauth2AuthorizeRequestQueryParameters = {
        responseType: "code",
        clientId: this.config.userPoolClientId,
        redirectUri: this.config.userPoolClientRedirectUri,
      };

      const authorizeResponse = await this.httpRequestService.get<{ xsrfToken: string }>(`${this.config.authServiceDomain}/oauth2/authorize`, authorizeQueryParams as unknown as Record<string, string>);

      const confirmHeaders = { Cookie: `XSRF-TOKEN=${authorizeResponse.body.xsrfToken}` };

      const confirmBody: AuthServiceConfirmationRequestBody = {
        email: confirmInput.email,
        confirmationCode: confirmInput.confirmationCode,
        session: confirmInput.session,
        clientId: this.config.userPoolClientId,
        redirectUri: this.config.userPoolClientRedirectUri,
      };

      const confirmResponse = await this.httpRequestService.post<AuthServiceConfirmationResponseBody>(`${this.config.authServiceDomain}/confirm`, confirmBody, {}, confirmHeaders);

      this.loggerService.info("confirmResponse", { confirmResponse }, this.constructor.name);

      return confirmResponse.body;
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, confirmInput }, this.constructor.name);

      throw error;
    }
  }
}

type AuthenticationServiceEnvConfigType = Pick<EnvConfigInterface, "authServiceDomain" | "userPoolClientId" | "userPoolClientRedirectUri" | "userPoolClientSecret" >;

export interface AuthenticationServiceInterface {
  login(loginInput: LoginInputDto): Promise<AuthServiceLoginResponseBody>;
  confirm(confirmInput: ConfirmationInputDto): Promise<AuthServiceConfirmationResponseBody>;
}
