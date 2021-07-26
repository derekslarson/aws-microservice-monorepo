import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { CreateGroupDto } from "../dtos/createGroup.dto";
import { GetGroupDto } from "../dtos/getGroup.dto";
import { AddUserToGroupDto } from "../dtos/addUserToGroup.dto";
import { RemoveUserFromGroupDto } from "../dtos/removeUserFromGroup.dto";
import { GetGroupsByUserIdDto } from "../dtos/getGroupsByUserId.dto";
import { GetGroupsByTeamIdDto } from "../dtos/getGroupsByTeamId.dto";
import { TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";
import { GetGroupImageUploadUrlDto } from "../dtos/getGroupImageUploadUrl.dto";

@injectable()
export class GroupController extends BaseController implements GroupControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private groupMediatorService: GroupMediatorServiceInterface,
    @inject(TYPES.TeamMediatorServiceInterface) private teamMediatorService: TeamMediatorServiceInterface,
  ) {
    super();
  }

  public async createGroup(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createGroup called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        body: { name, teamId },
      } = this.validationService.validate({ dto: CreateGroupDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      if (teamId) {
        const { isTeamAdmin } = await this.teamMediatorService.isTeamAdmin({ teamId, userId });

        if (!isTeamAdmin) {
          throw new ForbiddenError("Forbidden");
        }
      }

      const { group } = await this.groupMediatorService.createGroup({ name, createdBy: userId, teamId });

      return this.generateCreatedResponse({ group });
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroup", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getGroup(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGroup called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId },
      } = this.validationService.validate({ dto: GetGroupDto, request, getUserIdFromJwt: true });

      const { isGroupMember } = await this.groupMediatorService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { group } = await this.groupMediatorService.getGroup({ groupId });

      return this.generateSuccessResponse({ group });
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroup", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getGroupImageUploadUrl(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGroupImageUploadUrl called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId },
        queryStringParameters: { mime_type: mimeType },
      } = this.validationService.validate({ dto: GetGroupImageUploadUrlDto, request, getUserIdFromJwt: true });

      const { isGroupAdmin } = await this.groupMediatorService.isGroupAdmin({ groupId, userId: jwtId });

      if (!isGroupAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { uploadUrl } = this.groupMediatorService.getGroupImageUploadUrl({ groupId, mimeType });

      // method needs to return promise
      return Promise.resolve(this.generateSuccessResponse({ uploadUrl }));
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupImageUploadUrl", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async addUserToGroup(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("addUserToGroup called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId },
        body: { userId, role },
      } = this.validationService.validate({ dto: AddUserToGroupDto, request, getUserIdFromJwt: true });

      const { isGroupAdmin } = await this.groupMediatorService.isGroupAdmin({ groupId, userId: jwtId });

      if (!isGroupAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.groupMediatorService.addUserToGroup({ groupId, userId, role });

      return this.generateSuccessResponse({ message: "User added to group." });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToGroup", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async removeUserFromGroup(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("removeUserFromGroup called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId, userId },
      } = this.validationService.validate({ dto: RemoveUserFromGroupDto, request, getUserIdFromJwt: true });

      const { isGroupAdmin } = await this.groupMediatorService.isGroupAdmin({ groupId, userId: jwtId });

      if (!isGroupAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.groupMediatorService.removeUserFromGroup({ groupId, userId });

      return this.generateSuccessResponse({ message: "User removed from group." });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromGroup", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getGroupsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGroupsByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetGroupsByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { groups, lastEvaluatedKey } = await this.groupMediatorService.getGroupsByUserId({ userId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      return this.generateSuccessResponse({ groups, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getGroupsByTeamId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGroupsByTeamId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetGroupsByTeamIdDto, request, getUserIdFromJwt: true });

      const { isTeamMember } = await this.teamMediatorService.isTeamMember({ teamId, userId: jwtId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { groups, lastEvaluatedKey } = await this.groupMediatorService.getGroupsByTeamId({ teamId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      return this.generateSuccessResponse({ groups, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface GroupControllerInterface {
  createGroup(request: Request): Promise<Response>;
  getGroup(request: Request): Promise<Response>;
  addUserToGroup(request: Request): Promise<Response>;
  removeUserFromGroup(request: Request): Promise<Response>;
  getGroupImageUploadUrl(request: Request): Promise<Response>;
  getGroupsByUserId(request: Request): Promise<Response>;
  getGroupsByTeamId(request: Request): Promise<Response>;
}
