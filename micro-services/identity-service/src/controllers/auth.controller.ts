// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ValidationServiceInterface, LoggerServiceInterface, Request, Response, RequestPortion } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { AuthenticationServiceInterface } from "../services/authentication.service";
import { SignUpInputDto } from "../models/sign-up/signUp.input.model";
import { LoginInputDto } from "../models/login/login.input.model";
import { ConfirmationInputDto } from "../models/confirmation/confirmation.input.model";
import { AuthorizationServiceInterface } from "../services/authorization.service";

@injectable()
export class AuthController extends BaseController implements AuthControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceInterface) private validationService: ValidationServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.AuthenticationServiceInterface) private authenticationService: AuthenticationServiceInterface,
    @inject(TYPES.AuthorizationServiceInterface) private authorizationService: AuthorizationServiceInterface,
  ) {
    super();
  }

  public async signUp(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("signUp called", { request }, this.constructor.name);

      const signUpInput = await this.validationService.validate(SignUpInputDto, RequestPortion.Body, request.body);

      const responseBody = await this.authenticationService.signUp(signUpInput);

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

      const responseBody = await this.authenticationService.login(loginInput);

      return this.generateSuccessResponse(responseBody);
    } catch (error: unknown) {
      this.loggerService.error("Error in login", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async confirm(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("confirm called", { request }, this.constructor.name);

      const confirmInput = await this.validationService.validate(ConfirmationInputDto, RequestPortion.Body, request.body);

      const { confirmed, session, authorizationCode } = await this.authenticationService.confirm(confirmInput);

      if (confirmed && authorizationCode) {
        const tokens = await this.authorizationService.getTokens(authorizationCode);

        return this.generateSuccessResponse({ confirmed, ...tokens });
      }

      return this.generateSuccessResponse({ confirmed, session });
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface AuthControllerInterface {
  signUp(request: Request): Promise<Response>;
  login(request: Request): Promise<Response>;
  confirm(request: Request): Promise<Response>;
}
