import "reflect-metadata";
import { injectable, inject } from "inversify";
import { TYPES } from "../inversion-of-control/types";
import { Request } from "../models/http/request.model";
import { Response } from "../models/http/response.model";
import { BaseController } from "./base.controller";
import { LoggerServiceInterface } from "../services/logger.service";
import { ValidationServiceInterface } from "../services/validation.service";
import { AuthenticationServiceInterface } from "../services/authentication.service";
import { SignUpInputDto } from "../models/sign-up/signUp.input.model";
import { LoginInputDto } from "../models/login/login.input.model";
import { ConfirmationInputDto } from "../models/confirmation/confirmation.input.model";

@injectable()
export class AuthenticationController extends BaseController implements AuthenticationControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceInterface) private validationService: ValidationServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.AuthenticationServiceInterface) private authenticationService: AuthenticationServiceInterface,
  ) {
    super();
  }

  public async signUp(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("signUp called", { request }, this.constructor.name);

      const signUpInput = await this.validationService.validate(SignUpInputDto, request.body);

      await this.authenticationService.signUp(signUpInput);

      return this.generateCreatedResponse({ message: "Check email for magic link" });
    } catch (error: unknown) {
      this.loggerService.error("Error in signUp", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async login(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("login called", { request }, this.constructor.name);

      const loginInput = await this.validationService.validate(LoginInputDto, request.body);

      await this.authenticationService.login(loginInput);

      return this.generateSuccessResponse({ message: "Check email for magic link" });
    } catch (error: unknown) {
      this.loggerService.error("Error in login", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async confirm(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("confirm called", { request }, this.constructor.name);

      const confirmationInput = await this.validationService.validate(ConfirmationInputDto, request.queryStringParameters);

      const response = await this.authenticationService.confirm(confirmationInput);

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface AuthenticationControllerInterface {
  signUp(request: Request): Promise<Response>;
  login(request: Request): Promise<Response>;
  confirm(request: Request): Promise<Response>;
}
