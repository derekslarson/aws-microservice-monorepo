// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import {
  LoggerServiceInterface,
  HttpRequestService,
  AuthServiceSignUpResponseBody,
  AuthServiceSignUpRequestBody,
  AuthServiceLoginResponseBody,
  AuthServiceLoginRequestBody,
  AuthServiceConfirmationResponseBody,
  AuthServiceConfirmationRequestBody,
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

  public async signUp(signUpInput: SignUpInputDto): Promise<AuthServiceSignUpResponseBody> {
    try {
      this.loggerService.trace("signUp called", { signUpInput }, this.constructor.name);

      const body: AuthServiceSignUpRequestBody = { email: signUpInput.email };

      const response = await this.httpRequestService.post<AuthServiceSignUpResponseBody>(`${this.config.authServiceDomain}/sign-up`, body);

      return response.body;
    } catch (error: unknown) {
      this.loggerService.error("Error in signUp", { error, signUpInput }, this.constructor.name);

      throw error;
    }
  }

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

      const confirmBody: AuthServiceConfirmationRequestBody = {
        email: confirmInput.email,
        confirmationCode: confirmInput.confirmationCode,
        session: confirmInput.session,
        clientId: this.config.userPoolClientId,
        redirectUri: this.config.userPoolClientRedirectUri,
      };

      const confirmResponse = await this.httpRequestService.post<AuthServiceConfirmationResponseBody>(`${this.config.authServiceDomain}/confirm`, confirmBody, {});

      return confirmResponse.body;
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, confirmInput }, this.constructor.name);

      throw error;
    }
  }
}

export interface AuthenticationServiceInterface {
  signUp(signUpInput: SignUpInputDto): Promise<AuthServiceSignUpResponseBody>
  login(loginInput: LoginInputDto): Promise<AuthServiceLoginResponseBody>;
  confirm(confirmInput: ConfirmationInputDto): Promise<AuthServiceConfirmationResponseBody>;
}
