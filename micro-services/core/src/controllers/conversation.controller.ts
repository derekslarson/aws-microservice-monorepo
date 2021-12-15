import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { GetOneOnOnesAndGroupsByUserIdDto } from "../dtos/getOneOnOnesAndGroupsByUserId";
import { ConversationOrchestratorServiceInterface } from "../orchestrator-services/conversation.orchestrator.service";

@injectable()
export class ConversationController extends BaseController implements ConversationControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationOrchestratorServiceInterface) private conversationOrchestratorService: ConversationOrchestratorServiceInterface,
  ) {
    super();
  }

  public async getOneOnOnesAndGroupsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getOneOnOnesAndGroupsByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetOneOnOnesAndGroupsByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { oneOnOnesAndGroups, lastEvaluatedKey } = await this.conversationOrchestratorService.getOneOnOnesAndGroupsByUserId({
        userId,
        exclusiveStartKey,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return this.generateSuccessResponse({ oneOnOnesAndGroups, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesAndGroupsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface ConversationControllerInterface {
  getOneOnOnesAndGroupsByUserId(request: Request): Promise<Response>;
}
