import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ForbiddenError, LoggerServiceInterface, Request, Response, ValidationServiceV2Interface, User, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { GetUserDto } from "../dtos/getUser.dto";
import { GetUsersByTeamIdDto } from "../dtos/getUsersByTeamId.dto";
import { GetUsersByGroupIdDto } from "../dtos/getUsersByGroupId.dto";
import { GetUsersByMeetingIdDto } from "../dtos/getUsersByMeetingId.dto";
import { GetUserImageUploadUrlDto } from "../dtos/getUserImageUploadUrl.dto";
import { UpdateUserDto } from "../dtos/updateUser.dto";
import { GetUsersByOrganizationIdDto } from "../dtos/getUsersByOrganizationId.dto";
import { UserServiceInterface } from "../services/tier-1/user.service";
import { OrganizationServiceInterface } from "../services/tier-1/organization.service";
import { TeamServiceInterface } from "../services/tier-1/team.service";
import { GroupServiceInterface } from "../services/tier-1/group.service";
import { MeetingServiceInterface } from "../services/tier-1/meeting.service";

@injectable()
export class UserController extends BaseController implements UserControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private meetingService: MeetingServiceInterface,
  ) {
    super();
  }

  public async updateUser(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("updateUser called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        body,
      } = this.validationService.validate({ dto: UpdateUserDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      await this.userService.updateUser({ userId, updates: body });

      const response: UpdateUserResponse = { message: "User updated." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateUser", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getUser(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUser called", { request }, this.constructor.name);

      const { pathParameters: { userId } } = this.validationService.validate({ dto: GetUserDto, request, getUserIdFromJwt: true });

      const { user } = await this.userService.getUser({ userId });

      const response: GetUserResponse = { user };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getUser", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getUserImageUploadUrl(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUserImageUploadUrl called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        queryStringParameters: { mime_type: mimeType },
      } = this.validationService.validate({ dto: GetUserImageUploadUrlDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { uploadUrl } = this.userService.getUserImageUploadUrl({ userId, mimeType });

      // method needs to return promise
      return Promise.resolve(this.generateSuccessResponse({ uploadUrl }));
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserImageUploadUrl", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getUsersByOrganizationId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUsersByOrganizationId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetUsersByOrganizationIdDto, request, getUserIdFromJwt: true });

      const { isOrganizationMember } = await this.organizationService.isOrganizationMember({ organizationId, userId: jwtId });

      if (!isOrganizationMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.userService.getUsersByEntityId({ entityId: organizationId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetUsersByOrganizationIdResponse = { users, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByOrganizationId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getUsersByTeamId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetUsersByTeamIdDto, request, getUserIdFromJwt: true });

      const { isTeamMember } = await this.teamService.isTeamMember({ teamId, userId: jwtId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.userService.getUsersByEntityId({ entityId: teamId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetUsersByTeamIdResponse = { users, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getUsersByGroupId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUsersByGroupId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { groupId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetUsersByGroupIdDto, request, getUserIdFromJwt: true });

      const { isGroupMember } = await this.groupService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.userService.getUsersByEntityId({ entityId: groupId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetUsersByGroupIdResponse = { users, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByGroupId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getUsersByMeetingId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUsersByMeetingId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { meetingId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetUsersByMeetingIdDto, request, getUserIdFromJwt: true });

      const { isMeetingMember } = await this.meetingService.isMeetingMember({ meetingId, userId: jwtId });

      if (!isMeetingMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.userService.getUsersByEntityId({ entityId: meetingId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetUsersByMeetingIdResponse = { users, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByMeetingId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface UserControllerInterface {
  updateUser(request: Request): Promise<Response>;
  getUser(request: Request): Promise<Response>;
  getUserImageUploadUrl(request: Request): Promise<Response>;
  getUsersByOrganizationId(request: Request): Promise<Response>;
  getUsersByTeamId(request: Request): Promise<Response>;
  getUsersByGroupId(request: Request): Promise<Response>;
  getUsersByMeetingId(request: Request): Promise<Response>;
}

interface UpdateUserResponse {
  message: "User updated.";
}

interface GetUserResponse {
  user: User;
}

interface GetUsersByOrganizationIdResponse {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
}

interface GetUsersByTeamIdResponse {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
}

interface GetUsersByGroupIdResponse {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
}

interface GetUsersByMeetingIdResponse {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
}
