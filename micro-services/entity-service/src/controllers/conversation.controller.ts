import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { TeamServiceInterface } from "../services/team.service";
import { TeamUserMediatorServiceInterface } from "../mediator-services/team.user.mediator.service";
import { GetTeamsByUserIdRequestDto } from "../dtos/teams.getByUserId.dto";
@injectable()
export class ConversationController extends BaseController implements ConversationControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.TeamUserMediatorServiceInterface) private teamUserMediatorService: TeamUserMediatorServiceInterface,
  ) {
    super();
  }

  public async getConversationsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getConversationsByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
      } = this.validationService.validate(GetTeamsByUserIdRequestDto, request, true);

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { teams, lastEvaluatedKey } = await this.teamUserMediatorService.getTeamsByUserId({ userId });

      return this.generateSuccessResponse({ teams, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface ConversationControllerInterface {
  getConversationsByUserId(request: Request): Promise<Response>;
}
