// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ValidationServiceInterface, LoggerServiceInterface, Request, Response, RequestPortion, AuthServiceSignUpResponseBody, AuthServiceLoginResponseBody } from "@yac/core";

import { TYPES } from "../inversion-of-control/types";
import { AuthenticationServiceInterface } from "../services/authentication.service";
import { SignUpInputDto } from "../models/sign-up/signUp.input.model";
import { LoginInputDto } from "../models/login/login.input.model";
import { Oauth2AuthorizeInputDto } from "../models/oauth2-authorize/oauth2.authorize.input.model";
import { ConfirmationInput, ConfirmationRequestBodyDto, ConfirmationRequestCookiesDto } from "../models/confirmation/confirmation.input.model";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class AuthenticationController extends BaseController implements AuthenticationControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceInterface) private validationService: ValidationServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.AuthenticationServiceInterface) private authenticationService: AuthenticationServiceInterface,
    @inject(TYPES.EnvConfigInterface) private config: AuthenticationControllerConfigInterface,
  ) {
    super();
  }

  public async signUp(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("signUp called", { request }, this.constructor.name);

      const signUpInput = await this.validationService.validate(SignUpInputDto, RequestPortion.Body, request.body);

      await this.authenticationService.signUp(signUpInput);

      const { session } = await this.authenticationService.login({ email: signUpInput.email });

      const responseBody: AuthServiceSignUpResponseBody = { session };

      return this.generateCreatedResponse(responseBody);
    } catch (error: unknown) {
      this.loggerService.error("Error in signUp", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async login(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("login called", { request }, this.constructor.name);

      const loginInput = await this.validationService.validate(LoginInputDto, RequestPortion.Body, request.body);

      const { session } = await this.authenticationService.login(loginInput);

      const responseBody: AuthServiceLoginResponseBody = { session };

      return this.generateSuccessResponse(responseBody);
    } catch (error: unknown) {
      this.loggerService.error("Error in login", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async confirm(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("confirm called", { request }, this.constructor.name);

      const cookies = this.convertCookiesToObject(request.cookies);

      const confirmationRequestHeaders = await this.validationService.validate(ConfirmationRequestCookiesDto, RequestPortion.Cookies, cookies);
      const confirmationRequestBody = await this.validationService.validate(ConfirmationRequestBodyDto, RequestPortion.Body, request.body);

      const confirmationRequestInput: ConfirmationInput = {
        ...confirmationRequestBody,
        xsrfToken: confirmationRequestHeaders["XSRF-TOKEN"],
      };

      const confirmResponse = await this.authenticationService.confirm(confirmationRequestInput);

      this.loggerService.info("confirmResponse", { confirmResponse }, this.constructor.name);

      return this.generateSuccessResponse(confirmResponse);
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async oauth2Authorize(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("oauth2Authorize called", { request }, this.constructor.name);

      const oauth2AuthorizeInput = await this.validationService.validate(Oauth2AuthorizeInputDto, RequestPortion.QueryParameters, request.queryStringParameters);
      const { xsrfToken } = await this.authenticationService.getXsrfToken(oauth2AuthorizeInput.clientId, oauth2AuthorizeInput.redirectUri);

      if (oauth2AuthorizeInput.clientId === this.config.userPool.yacClientId) {
        return this.generateSuccessResponse({ xsrfToken });
      }

      return this.generateSeeOtherResponse(`${this.config.authUI}?client_id=${oauth2AuthorizeInput.clientId}&redirect_uri=${oauth2AuthorizeInput.redirectUri}`,
        {},
        [ `XSRF-TOKEN=${xsrfToken}; Path=/; Domain=${request.headers.host as string}; Secure; HttpOnly; SameSite=Lax` ]);
    } catch (error: unknown) {
      this.loggerService.error("Error in oauth2Authorize", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  private convertCookiesToObject(cookies: string[] = []): Record<string, string> {
    try {
      this.loggerService.trace("convertCookiesToObject called", { cookies }, this.constructor.name);

      const cookieObject = cookies.reduce((acc: Record<string, string>, cookie: string) => {
        const [ key, value ] = cookie.split("=");
        acc[key] = value;

        return acc;
      }, {});

      return cookieObject;
    } catch (error: unknown) {
      this.loggerService.error("Error in convertCookiesToObject", { error, cookies }, this.constructor.name);

      throw error;
    }
  }
}
export type AuthenticationControllerConfigInterface = Pick<EnvConfigInterface, "userPool" | "authUI">;

export interface AuthenticationControllerInterface {
  signUp(request: Request): Promise<Response>;
  login(request: Request): Promise<Response>;
  confirm(request: Request): Promise<Response>;
  oauth2Authorize(request: Request): Promise<Response>;
}
