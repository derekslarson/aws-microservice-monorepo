import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { CreateOneOnOnesDto } from "../dtos/createOneOnOnes.dto";
import { DeleteOneOnOneDto } from "../dtos/deleteOneOnOne.dto";
import { GetOneOnOnesByuserIdDto } from "../dtos/getOneOnOnesByUserId.dto";
import { OneOnOneServiceInterface } from "../services/tier-1/oneOnOne.service";
import { InvitationServiceInterface } from "../services/tier-2/invitation.service";
import { ConversationServiceInterface } from "../services/tier-3/conversation.service";

@injectable()
export class OneOnOneController extends BaseController implements OneOnOneControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OneOnOneServiceInterface) private oneOnOneService: OneOnOneServiceInterface,
    @inject(TYPES.InvitationServiceInterface) private invitationService: InvitationServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
  ) {
    super();
  }

  public async createOneOnOnes(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createOneOnOnes called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        body: { users },
      } = this.validationService.validate({ dto: CreateOneOnOnesDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { successes, failures } = await this.invitationService.createOneOnOnes({ userId, users });

      const response = {
        message: `One-on-ones created${failures.length ? ", but with some failures." : "."}`,
        successes,
        ...(failures.length && { failures }),
      };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in createOneOnOnes", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async deleteOneOnOne(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("deleteOneOnOne called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { oneOnOneId },
      } = this.validationService.validate({ dto: DeleteOneOnOneDto, request, getUserIdFromJwt: true });

      if (!oneOnOneId.includes(jwtId)) {
        throw new ForbiddenError("Forbidden");
      }

      await this.oneOnOneService.deleteOneOnOne({ oneOnOneId });

      return this.generateSuccessResponse({ message: "One-on-one deleted." });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteOneOnOne", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getOneOnOnesByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getOneOnOnesByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetOneOnOnesByuserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { oneOnOnes, lastEvaluatedKey } = await this.conversationService.getOneOnOnesByUserId({ userId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      return this.generateSuccessResponse({ oneOnOnes, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface OneOnOneControllerInterface {
  createOneOnOnes(request: Request): Promise<Response>;
  deleteOneOnOne(request: Request): Promise<Response>;
  getOneOnOnesByUserId(request: Request): Promise<Response>;
}
