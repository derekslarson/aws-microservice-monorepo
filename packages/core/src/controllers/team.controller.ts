import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController } from "@yac/util/src/controllers/base.controller";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { ValidationServiceV2Interface } from "@yac/util/src/services/validation.service.v2";
import { Team } from "@yac/util/src/api-contracts/business-objects/team.model";
import { Request } from "@yac/util/src/models/http/request.model";
import { Response } from "@yac/util/src/models/http/response.model";
import { ForbiddenError } from "@yac/util/src/errors/forbidden.error";
import { WithRole } from "@yac/util/src/types/withRole.type";
import { TYPES } from "../inversion-of-control/types";
import { CreateTeamDto } from "../dtos/createTeam.dto";
import { GetTeamDto } from "../dtos/getTeam.dto";
import { AddUsersToTeamDto } from "../dtos/addUsersToTeam.dto";
import { RemoveUserFromTeamDto } from "../dtos/removeUserFromTeam.dto";
import { GetTeamsByUserIdDto } from "../dtos/getTeamsByUserId.dto";
import { GetTeamImageUploadUrlDto } from "../dtos/getTeamImageUploadUrl.dto";
import { UpdateTeamDto } from "../dtos/updateTeam.dto";
import { GetTeamsByOrganizationIdDto } from "../dtos/getTeamsByOrganizationId.dto";
import { OrganizationServiceInterface } from "../services/tier-1/organization.service";
import { TeamServiceInterface } from "../services/tier-1/team.service";
import { AddUsersToTeamOutput, InvitationServiceInterface } from "../services/tier-2/invitation.service";

@injectable()
export class TeamController extends BaseController implements TeamControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.InvitationServiceInterface) private invitationService: InvitationServiceInterface,
  ) {
    super();
  }

  public async createTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createTeam called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId },
        body: { name },
      } = this.validationService.validate({ dto: CreateTeamDto, request, getUserIdFromJwt: true });

      const { isOrganizationAdmin } = await this.organizationService.isOrganizationAdmin({ organizationId, userId: jwtId });

      if (!isOrganizationAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { team } = await this.teamService.createTeam({ name, createdBy: jwtId, organizationId });

      const response: CreateTeamResponse = { team };

      return this.generateCreatedResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in createTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async updateTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("updateTeam called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId },
        body,
      } = this.validationService.validate({ dto: UpdateTeamDto, request, getUserIdFromJwt: true });

      const { isTeamAdmin } = await this.teamService.isTeamAdmin({ teamId, userId: jwtId });

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.teamService.updateTeam({ teamId, updates: body });

      const response: UpdateTeamResponse = { message: "Team updated." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getTeam called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId },
      } = this.validationService.validate({ dto: GetTeamDto, request, getUserIdFromJwt: true });

      const { isTeamMember } = await this.teamService.isTeamMember({ teamId, userId: jwtId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { team } = await this.teamService.getTeam({ teamId });

      const response: GetTeamResponse = { team };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getTeamImageUploadUrl(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getTeamImageUploadUrl called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId },
        queryStringParameters: { mime_type: mimeType },
      } = this.validationService.validate({ dto: GetTeamImageUploadUrlDto, request, getUserIdFromJwt: true });

      const { isTeamAdmin } = await this.teamService.isTeamAdmin({ teamId, userId: jwtId });

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { uploadUrl } = this.teamService.getTeamImageUploadUrl({ teamId, mimeType });

      const response: GetTeamImageUploadUrlResponse = { uploadUrl };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamImageUploadUrl", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async addUsersToTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("addUsersToTeam called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId },
        body: { users },
      } = this.validationService.validate({ dto: AddUsersToTeamDto, request, getUserIdFromJwt: true });

      const { isTeamAdmin } = await this.teamService.isTeamAdmin({ teamId, userId: jwtId });

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { successes, failures } = await this.invitationService.addUsersToTeam({ teamId, users });

      const response: AddUsersToTeamResponse = {
        message: `Users added to team${failures.length ? ", but with some failures." : "."}`,
        successes,
        ...(failures.length && { failures }),
      };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async removeUserFromTeam(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("removeUserFromTeam called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId, userId },
      } = this.validationService.validate({ dto: RemoveUserFromTeamDto, request, getUserIdFromJwt: true });

      const { isTeamAdmin } = await this.teamService.isTeamAdmin({ teamId, userId: jwtId });

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.teamService.removeUserFromTeam({ teamId, userId });

      const response: RemoveUserFromTeamResponse = { message: "User removed from team." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromTeam", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getTeamsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getTeamsByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        queryStringParameters: { searchTerm, exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetTeamsByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { teams, lastEvaluatedKey } = await this.teamService.getTeamsByUserId({ userId, searchTerm, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetTeamsByUserIdResponse = { teams, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getTeamsByOrganizationId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getTeamsByOrganizationId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId },
        queryStringParameters: { searchTerm, exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetTeamsByOrganizationIdDto, request, getUserIdFromJwt: true });

      const { isOrganizationMember } = await this.organizationService.isOrganizationMember({ organizationId, userId: jwtId });

      if (!isOrganizationMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { teams, lastEvaluatedKey } = await this.teamService.getTeamsByOrganizationId({ organizationId, searchTerm, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetTeamsByOrganizationIdResponse = { teams, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByOrganizationId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface TeamControllerInterface {
  createTeam(request: Request): Promise<Response>;
  updateTeam(request: Request): Promise<Response>;
  getTeam(request: Request): Promise<Response>;
  addUsersToTeam(request: Request): Promise<Response>;
  removeUserFromTeam(request: Request): Promise<Response>;
  getTeamImageUploadUrl(request: Request): Promise<Response>;
  getTeamsByUserId(request: Request): Promise<Response>;
  getTeamsByOrganizationId(request: Request): Promise<Response>;
}

interface CreateTeamResponse {
  team: Team;
}

interface GetTeamResponse {
  team: Team;
}

interface GetTeamImageUploadUrlResponse {
  uploadUrl: string;
}

interface AddUsersToTeamResponse {
  message: string;
  successes?: AddUsersToTeamOutput["successes"];
  failures?: AddUsersToTeamOutput["failures"];
}

interface RemoveUserFromTeamResponse {
  message: string;
}
interface UpdateTeamResponse {
  message: "Team updated.";
}

interface GetTeamsByUserIdResponse {
  teams: WithRole<Team>[];
  lastEvaluatedKey?: string;
}

interface GetTeamsByOrganizationIdResponse {
  teams: Team[];
  lastEvaluatedKey?: string;
}
