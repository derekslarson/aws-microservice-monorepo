import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ForbiddenError, LoggerServiceInterface, Request, Response, UserId, ValidationServiceV2Interface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { InitiateGoogleAccessFlowDto } from "../dtos/initiateGoogleAccessFlow.dto";
import { CompleteGoogleAccessFlowDto } from "../dtos/completeGoogleAccessFlow.dto";
import { GoogleCalendarServiceInterface } from "../services/tier-2/google.calendar.service";
import { GetGoogleEventsDto } from "../dtos/getGoogleEvents.dto";

@injectable()
export class CalendarController extends BaseController implements CalendarControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.GoogleCalendarServiceInterface) private googleCalendarService: GoogleCalendarServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {
    super();
  }

  public async initiateGoogleAccessFlow(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("initiateGoogleAccessFlow called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        queryStringParameters: { redirectUri },
      } = this.validationService.validate({ dto: InitiateGoogleAccessFlowDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { authUri } = await this.googleCalendarService.initiateAccessFlow({ userId: userId as UserId, redirectUri });

      return this.generateSuccessResponse({ authUri });
    } catch (error: unknown) {
      this.loggerService.error("Error in initiateGoogleAccessFlow", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async completeGoogleAccessFlow(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("completeGoogleAccessFlow called", { request }, this.constructor.name);

      const { queryStringParameters: { code: authorizationCode, state } } = this.validationService.validate({ dto: CompleteGoogleAccessFlowDto, request });

      const { redirectUri } = await this.googleCalendarService.completeAccessFlow({ authorizationCode, state });

      return this.generateSeeOtherResponse(redirectUri);
    } catch (error: unknown) {
      this.loggerService.error("Error in completeGoogleAccessFlow", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getGoogleEvents(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGoogleEvents called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
      } = this.validationService.validate({ dto: GetGoogleEventsDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { events } = await this.googleCalendarService.getEvents({ userId: userId as UserId });

      return this.generateSuccessResponse({ events });
    } catch (error: unknown) {
      this.loggerService.error("Error in getGoogleEvents", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface CalendarControllerInterface {
  initiateGoogleAccessFlow(request: Request): Promise<Response>;
  completeGoogleAccessFlow(request: Request): Promise<Response>;
  getGoogleEvents(request: Request): Promise<Response>;
}
