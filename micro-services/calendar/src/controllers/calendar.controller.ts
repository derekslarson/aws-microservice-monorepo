import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ForbiddenError, LoggerServiceInterface, Request, Response, UserId, ValidationServiceV2Interface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { GoogleAuthServiceInterface } from "../mediator-services/google.auth.service";
import { InitiateGoogleAccessFlowDto } from "../dtos/initiateGoogleAccessFlow.dto";
import { CompleteGoogleAccessFlowDto } from "../dtos/completeGoogleAccessFlow.dto";

@injectable()
export class CalendarController extends BaseController implements CalendarControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.GoogleAuthServiceInterface) private googleAuthService: GoogleAuthServiceInterface,
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

      const { authUri } = await this.googleAuthService.initiateGoogleAccessFlow({ userId: userId as UserId, redirectUri });

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

      const { redirectUri } = await this.googleAuthService.completeGoogleAccessFlow({ authorizationCode, state });

      return this.generateSeeOtherResponse(redirectUri);
    } catch (error: unknown) {
      this.loggerService.error("Error in completeGoogleAccessFlow", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface CalendarControllerInterface {
  initiateGoogleAccessFlow(request: Request): Promise<Response>;
  completeGoogleAccessFlow(request: Request): Promise<Response>
}
