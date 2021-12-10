import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface, Group, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { CreateGroupDto } from "../dtos/createGroup.dto";
import { GetGroupDto } from "../dtos/getGroup.dto";
import { AddUsersToGroupDto } from "../dtos/addUsersToGroup.dto";
import { RemoveUserFromGroupDto } from "../dtos/removeUserFromGroup.dto";
import { GetGroupsByUserIdDto } from "../dtos/getGroupsByUserId.dto";
import { GetGroupsByTeamIdDto } from "../dtos/getGroupsByTeamId.dto";
import { TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";
import { GetGroupImageUploadUrlDto } from "../dtos/getGroupImageUploadUrl.dto";
import { AddUsersToGroupOutput, InvitationOrchestratorServiceInterface } from "../orchestrator-services/invitation.orchestrator.service";
import { UpdateGroupDto } from "../dtos/updateGroup.dto";
import { OrganizationMediatorServiceInterface } from "../mediator-services/organization.mediator.service";
import { GetGroupsByOrganizationIdDto } from "../dtos/getGroupsByOrganizationId.dto";

@injectable()
export class GroupController extends BaseController implements GroupControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.InvitationOrchestratorServiceInterface) private invitationOrchestratorService: InvitationOrchestratorServiceInterface,
    @inject(TYPES.OrganizationMediatorServiceInterface) private organizationMediatorService: OrganizationMediatorServiceInterface,
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
        pathParameters: { organizationId },
        body: { name, teamId },
      } = this.validationService.validate({ dto: CreateGroupDto, request, getUserIdFromJwt: true });

      if (teamId) {
        const [ { isTeamAdmin }, { team } ] = await Promise.all([
          this.teamMediatorService.isTeamAdmin({ teamId, userId: jwtId }),
          this.teamMediatorService.getTeam({ teamId }),
        ]);

        if (!isTeamAdmin || team.organizationId !== organizationId) {
          throw new ForbiddenError("Forbidden");
        }
      } else {
        const { isOrganizationAdmin } = await this.organizationMediatorService.isOrganizationAdmin({ organizationId, userId: jwtId });

        if (!isOrganizationAdmin) {
          throw new ForbiddenError("Forbidden");
        }
      }
      const { group } = await this.groupMediatorService.createGroup({ name, createdBy: jwtId, organizationId, teamId });

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

      const { isGroupAdmin } = await this.groupMediatorService.isGroupAdmin({ groupId, userId: jwtId });

      if (!isGroupAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.groupMediatorService.updateGroup({ groupId, updates });

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

      const { isGroupMember } = await this.groupMediatorService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { group } = await this.groupMediatorService.getGroup({ groupId });

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

      const { isGroupAdmin } = await this.groupMediatorService.isGroupAdmin({ groupId, userId: jwtId });

      if (!isGroupAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { uploadUrl } = this.groupMediatorService.getGroupImageUploadUrl({ groupId, mimeType });

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

      const { isGroupAdmin } = await this.groupMediatorService.isGroupAdmin({ groupId, userId: jwtId });

      if (!isGroupAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { successes, failures } = await this.invitationOrchestratorService.addUsersToGroup({ groupId, users });

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

      const { isGroupAdmin } = await this.groupMediatorService.isGroupAdmin({ groupId, userId: jwtId });

      if (!isGroupAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.groupMediatorService.removeUserFromGroup({ groupId, userId });

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
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetGroupsByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { groups, lastEvaluatedKey } = await this.groupMediatorService.getGroupsByUserId({ userId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

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
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetGroupsByTeamIdDto, request, getUserIdFromJwt: true });

      const { isTeamMember } = await this.teamMediatorService.isTeamMember({ teamId, userId: jwtId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { groups, lastEvaluatedKey } = await this.groupMediatorService.getGroupsByTeamId({ teamId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

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
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetGroupsByOrganizationIdDto, request, getUserIdFromJwt: true });

      const { isOrganizationMember } = await this.organizationMediatorService.isOrganizationMember({ organizationId, userId: jwtId });

      if (!isOrganizationMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { groups, lastEvaluatedKey } = await this.groupMediatorService.getGroupsByOrganizationId({ organizationId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

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
  groups: WithRole<Group>[];
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
