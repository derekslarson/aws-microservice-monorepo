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
import { GetUsersByGroupIdDto } from "../dtos/getUsersByGroupId.dto";
@injectable()
export class GroupController extends BaseController implements GroupControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private groupMediatorService: GroupMediatorServiceInterface,
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

      // add validation for teamAdmin if teamId truthy

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

      const { membership } = await this.groupMediatorService.addUserToGroup({ groupId, userId, role });

      return this.generateSuccessResponse({ membership });
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

      return this.generateSuccessResponse({ message: "User removed from group" });
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
      } = this.validationService.validate({ dto: GetGroupsByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { groups, lastEvaluatedKey } = await this.groupMediatorService.getGroupsByUserId({ userId });

      return this.generateSuccessResponse({ groups, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getGroupsByTeamId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGroupsByTeamId called", { request }, this.constructor.name);

      const { pathParameters: { teamId } } = this.validationService.validate({ dto: GetGroupsByTeamIdDto, request, getUserIdFromJwt: true });

      // add teamMembership validaton

      const { groups, lastEvaluatedKey } = await this.groupMediatorService.getGroupsByTeamId({ teamId });

      return this.generateSuccessResponse({ groups, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getUsersByGroupId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUsersByGroupId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId },
      } = this.validationService.validate({ dto: GetUsersByGroupIdDto, request, getUserIdFromJwt: true });

      const { isGroupMember } = await this.groupMediatorService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.groupMediatorService.getUsersByGroupId({ groupId });

      return this.generateSuccessResponse({ users, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByConversationId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface GroupControllerInterface {
  createGroup(request: Request): Promise<Response>;
  getGroup(request: Request): Promise<Response>;
  addUserToGroup(request: Request): Promise<Response>;
  removeUserFromGroup(request: Request): Promise<Response>;
  getGroupsByUserId(request: Request): Promise<Response>;
  getGroupsByTeamId(request: Request): Promise<Response>;
  getUsersByGroupId(request: Request): Promise<Response>
}
