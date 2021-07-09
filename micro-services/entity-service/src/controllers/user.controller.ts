import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ForbiddenError, LoggerServiceInterface, Request, Response, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { GetUserDto } from "../dtos/getUser.dto";
import { GetUsersByTeamIdDto } from "../dtos/getUsersByTeamId.dto";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";
import { GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { GetUsersByGroupIdDto } from "../dtos/getUsersByGroupId.dto";
import { GetUsersByMeetingIdDto } from "../dtos/getUsersByMeetingId.dto";

@injectable()
export class UserController extends BaseController implements UserControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.TeamMediatorServiceInterface) private teamMediatorService: TeamMediatorServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private groupMediatorService: GroupMediatorServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private meetingMediatorService: MeetingMediatorServiceInterface,
  ) {
    super();
  }

  public async getUser(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getUser called", { request }, this.constructor.name);

      const { pathParameters: { userId } } = this.validationService.validate({ dto: GetUserDto, request, getUserIdFromJwt: true });

      const { user } = await this.userMediatorService.getUser({ userId });

      return this.generateSuccessResponse({ user });
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, request }, this.constructor.name);

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

      const { isTeamMember } = await this.teamMediatorService.isTeamMember({ teamId, userId: jwtId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.userMediatorService.getUsersByTeamId({ teamId, exclusiveStartKey, limit: parseInt(limit, 10) });

      return this.generateSuccessResponse({ users, lastEvaluatedKey });
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

      const { isGroupMember } = await this.groupMediatorService.isGroupMember({ groupId, userId: jwtId });

      if (!isGroupMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.userMediatorService.getUsersByGroupId({ groupId, exclusiveStartKey, limit: parseInt(limit, 10) });

      return this.generateSuccessResponse({ users, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByConversationId", { error, request }, this.constructor.name);

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

      const { isMeetingMember } = await this.meetingMediatorService.isMeetingMember({ meetingId, userId: jwtId });

      if (!isMeetingMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { users, lastEvaluatedKey } = await this.userMediatorService.getUsersByMeetingId({ meetingId, exclusiveStartKey, limit: parseInt(limit, 10) });

      return this.generateSuccessResponse({ users, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByMeetingId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface UserControllerInterface {
  getUser(request: Request): Promise<Response>;
  getUsersByTeamId(request: Request): Promise<Response>;
  getUsersByGroupId(request: Request): Promise<Response>;
  getUsersByMeetingId(request: Request): Promise<Response>;
}
