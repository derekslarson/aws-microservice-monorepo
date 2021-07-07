import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { GetConversationsByUserIdDto } from "../dtos/getConversationsByUserId.dto";
import { ConversationMediatorServiceInterface } from "../mediator-services/conversation.mediator.service";
@injectable()
export class ConversationController extends BaseController implements ConversationControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationMediatorServiceInterface) private conversationMediatorService: ConversationMediatorServiceInterface,
  ) {
    super();
  }

  public async getConversationsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getConversationsByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        queryStringParameters: { exclusiveStartKey, type, unread },
      } = this.validationService.validate({ dto: GetConversationsByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { conversations, lastEvaluatedKey } = await this.conversationMediatorService.getConversationsByUserId({
        userId,
        exclusiveStartKey,
        type,
        unread,
      });

      return this.generateSuccessResponse({ conversations, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface ConversationControllerInterface {
  getConversationsByUserId(request: Request): Promise<Response>;
}
