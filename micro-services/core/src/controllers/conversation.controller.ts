import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { GetOneOnOnesAndGroupsByUserIdDto } from "../dtos/getOneOnOnesAndGroupsByUserId";
import { ConversationServiceInterface } from "../services/tier-3/conversation.service";

@injectable()
export class ConversationController extends BaseController implements ConversationControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
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

      const { oneOnOnesAndGroups, lastEvaluatedKey } = await this.conversationService.getOneOnOnesAndGroupsByUserId({
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
