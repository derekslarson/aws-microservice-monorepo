import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController } from "@yac/util/src/controllers/base.controller";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { ValidationServiceV2Interface } from "@yac/util/src/services/validation.service.v2";
import { Group } from "@yac/util/src/api-contracts/business-objects/group.model";
import { GroupByUserId } from "@yac/util/src/api-contracts/business-objects/groupByUserId.model";
import { Request } from "@yac/util/src/models/http/request.model";
import { Response } from "@yac/util/src/models/http/response.model";
import { ForbiddenError } from "@yac/util/src/errors/forbidden.error";
import { TYPES } from "../inversion-of-control/types";
import { CreateGroupDto } from "../dtos/createGroup.dto";
import { GetGroupDto } from "../dtos/getGroup.dto";
import { AddUsersToGroupDto } from "../dtos/addUsersToGroup.dto";
import { RemoveUserFromGroupDto } from "../dtos/removeUserFromGroup.dto";
import { GetGroupsByUserIdDto } from "../dtos/getGroupsByUserId.dto";
import { GetGroupsByTeamIdDto } from "../dtos/getGroupsByTeamId.dto";
import { GetGroupImageUploadUrlDto } from "../dtos/getGroupImageUploadUrl.dto";
import { UpdateGroupDto } from "../dtos/updateGroup.dto";
import { GetGroupsByOrganizationIdDto } from "../dtos/getGroupsByOrganizationId.dto";
import { ConversationServiceInterface } from "../services/tier-3/conversation.service";
import { OrganizationServiceInterface } from "../services/tier-1/organization.service";
import { GroupServiceInterface } from "../services/tier-1/group.service";
import { TeamServiceInterface } from "../services/tier-1/team.service";
import { AddUsersToGroupOutput, InvitationServiceInterface } from "../services/tier-2/invitation.service";

@injectable()
export class GroupController extends BaseController implements GroupControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.InvitationServiceInterface) private invitationService: InvitationServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
  ) {
    super();
  }

  public async createGroup(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createGroup called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId },
        body: { name, teamId },
      } = this.validationService.validate({ dto: CreateGroupDto, request, getUserIdFromJwt: true });

      if (teamId) {
        const [ { isTeamAdmin }, { team } ] = await Promise.all([
          this.teamService.isTeamAdmin({ teamId, userId: jwtId }),
          this.teamService.getTeam({ teamId }),
        ]);

        if (!isTeamAdmin || team.organizationId !== organizationId) {
          throw new ForbiddenError("Forbidden");
        }
      } else {
        const { isOrganizationAdmin } = await this.organizationService.isOrganizationAdmin({ organizationId, userId: jwtId });

        if (!isOrganizationAdmin) {
          throw new ForbiddenError("Forbidden");
        }
      }
      const { group } = await this.groupService.createGroup({ name, createdBy: jwtId, organizationId, teamId });

      const response: CreateGroupResponse = { group };

      return this.generateCreatedResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in createGroup", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async updateGroup(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("updateGroup called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId },
        body: updates,
      } = this.validationService.validate({ dto: UpdateGroupDto, request, getUserIdFromJwt: true });

      const { isGroupAdmin } = await this.groupService.isGroupAdmin({ groupId, userId: jwtId });

      if (!isGroupAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.groupService.updateGroup({ groupId, updates });

      const response: UpdateGroupResponse = { message: "Group updated." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateGroup", { error, request }, this.constructor.name);

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

      const { isGroupMember } = await this.groupService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { group } = await this.groupService.getGroup({ groupId });

      const response: GetGroupResponse = { group };

      return this.generateSuccessResponse(response);
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

      const { isGroupAdmin } = await this.groupService.isGroupAdmin({ groupId, userId: jwtId });

      if (!isGroupAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { uploadUrl } = this.groupService.getGroupImageUploadUrl({ groupId, mimeType });

      const response: GetGroupImageUploadUrlResponse = { uploadUrl };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupImageUploadUrl", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async addUsersToGroup(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("addUsersToGroup called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId },
        body: { users },
      } = this.validationService.validate({ dto: AddUsersToGroupDto, request, getUserIdFromJwt: true });

      const { isGroupAdmin } = await this.groupService.isGroupAdmin({ groupId, userId: jwtId });

      if (!isGroupAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { successes, failures } = await this.invitationService.addUsersToGroup({ groupId, users });

      const response: AddUsersToGroupResponse = {
        message: `Users added to group${failures.length ? ", but with some failures." : "."}`,
        successes,
        ...(failures.length && { failures }),
      };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToGroup", { error, request }, this.constructor.name);

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

      const { isGroupAdmin } = await this.groupService.isGroupAdmin({ groupId, userId: jwtId });

      if (!isGroupAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.groupService.removeUserFromGroup({ groupId, userId });

      const response: RemoveUserFromGroupResponse = { message: "User removed from group." };

      return this.generateSuccessResponse(response);
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
        queryStringParameters: { searchTerm, exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetGroupsByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { groups, lastEvaluatedKey } = await this.conversationService.getGroupsByUserId({ searchTerm, userId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetGroupsByUserIdResponse = { groups, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
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
        queryStringParameters: { searchTerm, exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetGroupsByTeamIdDto, request, getUserIdFromJwt: true });

      const { isTeamMember } = await this.teamService.isTeamMember({ teamId, userId: jwtId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { groups, lastEvaluatedKey } = await this.conversationService.getGroupsByTeamId({ teamId, searchTerm, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetGroupsByTeamIdResponse = { groups, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getGroupsByOrganizationId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getGroupsByOrganizationId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId },
        queryStringParameters: { searchTerm, exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetGroupsByOrganizationIdDto, request, getUserIdFromJwt: true });

      const { isOrganizationMember } = await this.organizationService.isOrganizationMember({ organizationId, userId: jwtId });

      if (!isOrganizationMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { groups, lastEvaluatedKey } = await this.conversationService.getGroupsByOrganizationId({ organizationId, searchTerm, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetGroupsByOrganizationIdResponse = { groups, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByOrganizationId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface GroupControllerInterface {
  createGroup(request: Request): Promise<Response>;
  updateGroup(request: Request): Promise<Response>;
  getGroup(request: Request): Promise<Response>;
  addUsersToGroup(request: Request): Promise<Response>;
  removeUserFromGroup(request: Request): Promise<Response>;
  getGroupImageUploadUrl(request: Request): Promise<Response>;
  getGroupsByUserId(request: Request): Promise<Response>;
  getGroupsByTeamId(request: Request): Promise<Response>;
  getGroupsByOrganizationId(request: Request): Promise<Response>
}

interface CreateGroupResponse {
  group: Group;
}

interface UpdateGroupResponse {
  message: "Group updated.";
}

interface GetGroupResponse {
  group: Group;
}

interface GetGroupImageUploadUrlResponse {
  uploadUrl: string;
}

interface AddUsersToGroupResponse {
  message: string;
  successes?: AddUsersToGroupOutput["successes"];
  failures?: AddUsersToGroupOutput["failures"];
}

interface RemoveUserFromGroupResponse {
  message: string;
}

interface GetGroupsByUserIdResponse {
  groups: GroupByUserId[];
  lastEvaluatedKey?: string;
}

interface GetGroupsByTeamIdResponse {
  groups: Group[];
  lastEvaluatedKey?: string;
}

interface GetGroupsByOrganizationIdResponse {
  groups: Group[];
  lastEvaluatedKey?: string;
}
