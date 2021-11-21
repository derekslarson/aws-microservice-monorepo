// eslint-disable-next-line max-classes-per-file
import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, AuthServiceLoginResponseBody, ValidationServiceV2Interface, ForbiddenError } from "@yac/util";

import { TYPES } from "../inversion-of-control/types";
import { AuthenticationServiceInterface } from "../services/authentication.service";
import { EnvConfigInterface } from "../config/env.config";
import { LoginDto } from "../dtos/login.dto";
import { ConfirmDto } from "../dtos/confirm.dto";

@injectable()
export class AuthenticationController extends BaseController implements AuthenticationControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationServiceV2: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.AuthenticationServiceInterface) private authenticationService: AuthenticationServiceInterface,
  ) {
    super();
  }

  public async login(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("login called", { request }, this.constructor.name);

      const { body } = this.validationServiceV2.validate({ dto: LoginDto, request });

      await this.authenticationService.login(body);

      const responseBody: AuthServiceLoginResponseBody = { session: "" };

      return this.generateSuccessResponse(responseBody);
    } catch (error: unknown) {
      this.loggerService.error("Error in login", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async confirm(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("confirm called", { request }, this.constructor.name);

      const {
        cookies,
        body,
      } = this.validationServiceV2.validate({ dto: ConfirmDto, request });
      const parsedCookies = this.parseCookies(cookies);
      const xsrfToken = parsedCookies["XSRF-TOKEN"];

      if (!xsrfToken) {
        throw new ForbiddenError("Forbidden");
      }

      const confirmResponse = await this.authenticationService.confirm({
        ...body,
        xsrfToken,
      });

      return this.generateSuccessResponse(confirmResponse);
    } catch (error: unknown) {
      this.loggerService.error("Error in confirm", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  private parseCookies(cookies: string[] = []): Record<string, string> {
    try {
      this.loggerService.trace("parseCookies called", { cookies }, this.constructor.name);

      const cookieObject = cookies.reduce((acc: Record<string, string>, cookie: string) => {
        const [ key, value ] = cookie.split("=");
        acc[key] = value;

        return acc;
      }, {});

      return cookieObject;
    } catch (error: unknown) {
      this.loggerService.error("Error in parseCookies", { error, cookies }, this.constructor.name);

      throw error;
    }
  }
}
export type AuthenticationControllerConfigInterface = Pick<EnvConfigInterface, "userPool" | "authUI">;

export interface AuthenticationControllerInterface {
  login(request: Request): Promise<Response>;
  confirm(request: Request): Promise<Response>;
}
