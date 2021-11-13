import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class CalendarController extends BaseController implements CalendarControllerInterface {
  constructor(
    // @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {
    super();
  }

  public async getGoogleAccess(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGoogleAccess called", { request }, this.constructor.name);

      // placeholder
      await Promise.resolve();

      return this.generateSuccessResponse({ message: "Hello World" });
    } catch (error: unknown) {
      this.loggerService.error("Error in getGoogleAccess", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface CalendarControllerInterface {
  getGoogleAccess(request: Request): Promise<Response>;
}
