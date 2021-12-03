import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ForbiddenError, LoggerServiceInterface, Request, Response, ValidationServiceV2Interface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { InitiateGoogleAccessFlowDto } from "../dtos/initiateGoogleAccessFlow.dto";
import { CompleteGoogleAccessFlowDto } from "../dtos/completeGoogleAccessFlow.dto";
import { GoogleCalendarServiceInterface, GetAccountsOutput, GetEventsOutput, GetSettingsOutput } from "../services/tier-2/google.calendar.service";
import { GetGoogleEventsDto } from "../dtos/getGoogleEvents.dto";
import { UpdateGoogleSettingsDto } from "../dtos/updateGoogleSettings.dto";
import { GetGoogleAccountsDto } from "../dtos/getGoogleAccounts.dto";
import { GetGoogleSettingsDto } from "../dtos/getGoogleSettings.dto";

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

      const { authUri } = await this.googleCalendarService.initiateAccessFlow({ userId, redirectUri });

      const responseBody: InitiateAccessFlowResponseBody = { authUri };

      return this.generateSuccessResponse(responseBody);
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
        queryStringParameters: { exclusiveStartKey, limit, minTime, maxTime },
      } = this.validationService.validate({ dto: GetGoogleEventsDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }
      const limitNumber = limit ? parseInt(limit, 10) : undefined;
      const { events, lastEvaluatedKey } = await this.googleCalendarService.getEvents({ userId, limit: limitNumber, exclusiveStartKey, minTime, maxTime });

      const responseBody: GetGoogleEventsResponseBody = { lastEvaluatedKey, events };

      return this.generateSuccessResponse(responseBody);
    } catch (error: unknown) {
      this.loggerService.error("Error in getGoogleEvents", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getGoogleAccounts(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGoogleAccounts called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
      } = this.validationService.validate({ dto: GetGoogleAccountsDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { accounts } = await this.googleCalendarService.getAccounts({ userId });

      const responseBody: GetGoogleAccountsResponseBody = { accounts };

      return this.generateSuccessResponse(responseBody);
    } catch (error: unknown) {
      this.loggerService.error("Error in getGoogleAccounts", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getGoogleSettings(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGoogleSettings called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
      } = this.validationService.validate({ dto: GetGoogleSettingsDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { settings } = await this.googleCalendarService.getSettings({ userId });

      const responseBody: GetGoogleSettingsResponseBody = { settings };

      return this.generateSuccessResponse(responseBody);
    } catch (error: unknown) {
      this.loggerService.error("Error in getGoogleSettings", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async updateGoogleSettings(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("updateGoogleSettings called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        body,
      } = this.validationService.validate({ dto: UpdateGoogleSettingsDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      await this.googleCalendarService.updateSettings({ userId, updates: body });

      const responseBody: UpdateGoogleSettingsResponseBody = { message: "Settings updated." };

      return this.generateSuccessResponse(responseBody);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateGoogleSettings", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface CalendarControllerInterface {
  initiateGoogleAccessFlow(request: Request): Promise<Response>;
  completeGoogleAccessFlow(request: Request): Promise<Response>;
  getGoogleEvents(request: Request): Promise<Response>;
  getGoogleAccounts(request: Request): Promise<Response>;
  getGoogleSettings(request: Request): Promise<Response>;
  updateGoogleSettings(request: Request): Promise<Response>;
}

export interface InitiateAccessFlowResponseBody {
  authUri: string;
}

export interface GetGoogleEventsResponseBody {
  events: GetEventsOutput["events"];
  lastEvaluatedKey: GetEventsOutput["lastEvaluatedKey"];
}
export interface GetGoogleAccountsResponseBody {
  accounts: GetAccountsOutput["accounts"];
}
export interface GetGoogleSettingsResponseBody {
  settings: GetSettingsOutput["settings"];
}

export interface UpdateGoogleSettingsResponseBody {
  message: "Settings updated.";
}
