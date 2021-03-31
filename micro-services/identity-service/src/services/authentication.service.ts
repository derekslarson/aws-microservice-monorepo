// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import {
  LoggerServiceInterface,
  HttpRequestService,
} from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { SignUpInputDto } from "../models/sign-up/signUp.input.model";
import { LoginInputDto } from "../models/login/login.input.model";
import { ConfirmationInputDto } from "../models/confirmation/confirmation.input.model";

@injectable()
export class AuthenticationService implements AuthenticationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.HttpRequestServiceInterface) private httpRequestService: HttpRequestService,
    @inject(TYPES.EnvConfigInterface) private config: EnvConfigInterface,
  ) {}

  public async signUp(signUpInput: SignUpInputDto): Promise<SignUpResponseBody> {
    try {
      this.loggerService.trace("signUp called", { signUpInput }, this.constructor.name);

      const body: SignUpRequestBody = {
        email: signUpInput.email,
        clientId: this.config.userPoolClientId,
      };

      const response = await this.httpRequestService.post<SignUpResponseBody>(`${this.config.authServiceDomain}/sign-up`, body);

      return response.body;
    } catch (error: unknown) {
      this.loggerService.error("Error in signUp", { error, signUpInput }, this.constructor.name);

      throw error;
    }
  }

  public async login(loginInput: LoginInputDto): Promise<LoginResponseBody> {
    try {
      this.loggerService.trace("login called", { loginInput }, this.constructor.name);

      const body: LoginRequestBody = {
        email: loginInput.email,
        clientId: this.config.userPoolClientId,
      };

      const response = await this.httpRequestService.post<LoginResponseBody>(`${this.config.authServiceDomain}/login`, body);

      return response.body;
    } catch (error: unknown) {
      this.loggerService.error("Error in login", { error, loginInput }, this.constructor.name);

      throw error;
    }
  }

  public async confirm(confirmInput: ConfirmationInputDto): Promise<ConfirmationResponseBody> {
    try {
      this.loggerService.trace("confirm called", { confirmInput }, this.constructor.name);

      const authorizeQueryParams: Oauth2AuthorizeRequestQueryParameters = {
        responseType: "code",
        clientId: this.config.userPoolClientId,
        redirectUri: this.config.userPoolClientRedirectUri,
      };

      const authorizeResponse = await this.httpRequestService.get<{ xsrfToken: string }>(`${this.config.authServiceDomain}/oauth2/authorize`, authorizeQueryParams as unknown as Record<string, string>);

      const confirmBody: ConfirmationRequestBody = {
        email: confirmInput.email,
        confirmationCode: confirmInput.confirmationCode,
        session: confirmInput.session,
        clientId: this.config.userPoolClientId,
        redirectUri: this.config.userPoolClientRedirectUri,
      };

      const confirmHeaders: ConfirmationRequestHeaders = { "xsrf-token": authorizeResponse.body.xsrfToken };

      const confirmResponse = await this.httpRequestService.post<ConfirmationResponseBody>(`${this.config.authServiceDomain}/confirm`, confirmBody, {}, confirmHeaders as unknown as Record<string, string>);

      return confirmResponse.body;
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, confirmInput }, this.constructor.name);

      throw error;
    }
  }
}

export interface AuthenticationServiceInterface {
  signUp(signUpInput: SignUpInputDto): Promise<SignUpResponseBody>
  login(loginInput: LoginInputDto): Promise<LoginResponseBody>;
  confirm(confirmInput: ConfirmationInputDto): Promise<ConfirmationResponseBody>;
}
