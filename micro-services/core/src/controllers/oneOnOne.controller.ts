import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { CreateOneOnOneDto } from "../dtos/createOneOnOne.dto";
import { OneOnOneMediatorServiceInterface } from "../mediator-services/oneOnOne.mediator.service";
import { DeleteOneOnOneDto } from "../dtos/deleteOneOnOne.dto";
import { GetOneOnOnesByuserIdDto } from "../dtos/getOneOnOnesByUserId.dto";
import { InvitationOrchestratorServiceInterface } from "../orchestrator-services/invitation.orchestrator.service";

@injectable()
export class OneOnOneController extends BaseController implements OneOnOneControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OneOnOneMediatorServiceInterface) private oneOnOneMediatorService: OneOnOneMediatorServiceInterface,
    @inject(TYPES.InvitationOrchestratorServiceInterface) private invitationOrchestratorService: InvitationOrchestratorServiceInterface,
  ) {
    super();
  }

  public async createOneOnOne(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("addUserAsOneOnOne called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        body: { users },
      } = this.validationService.validate({ dto: CreateOneOnOneDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { successes, failures } = await this.invitationOrchestratorService.createOneOnOnes({ userId, users });

      const response = {
        message: `One-on-ones created${failures.length ? ", but with some failures." : "."}`,
        successes,
        ...(failures.length && { failures }),
      };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserAsOneOnOne", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async removeUserAsOneOnOne(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("removeUserAsOneOnOne called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId, otherUserId },
      } = this.validationService.validate({ dto: DeleteOneOnOneDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      await this.oneOnOneMediatorService.deleteOneOnOne({ userId, otherUserId });

      return this.generateSuccessResponse({ message: "One-on-one deleted." });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserAsOneOnOne", { error, request }, this.constructor.name);

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

      const { oneOnOnes, lastEvaluatedKey } = await this.oneOnOneMediatorService.getOneOnOnesByUserId({ userId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      return this.generateSuccessResponse({ oneOnOnes, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface OneOnOneControllerInterface {
  createOneOnOne(request: Request): Promise<Response>;
  removeUserAsOneOnOne(request: Request): Promise<Response>;
  getOneOnOnesByUserId(request: Request): Promise<Response>;
}
