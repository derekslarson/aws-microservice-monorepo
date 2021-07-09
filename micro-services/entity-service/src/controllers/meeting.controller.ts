import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { CreateMeetingDto } from "../dtos/createMeeting.dto";
import { GetMeetingDto } from "../dtos/getMeeting.dto";
import { AddUserToMeetingDto } from "../dtos/addUserToMeeting.dto";
import { RemoveUserFromMeetingDto } from "../dtos/removeUserFromMeeting.dto";
import { GetMeetingsByUserIdDto } from "../dtos/getMeetingsByUserId.dto";
import { GetMeetingsByTeamIdDto } from "../dtos/getMeetingsByTeamId.dto";
import { TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";
@injectable()
export class MeetingController extends BaseController implements MeetingControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private meetingMediatorService: MeetingMediatorServiceInterface,
    @inject(TYPES.TeamMediatorServiceInterface) private teamMediatorService: TeamMediatorServiceInterface,
  ) {
    super();
  }

  public async createMeeting(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createMeeting called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        body: { name, teamId, dueDate },
      } = this.validationService.validate({ dto: CreateMeetingDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      if (teamId) {
        const { isTeamAdmin } = await this.teamMediatorService.isTeamAdmin({ teamId, userId });

        if (!isTeamAdmin) {
          throw new ForbiddenError("Forbidden");
        }
      }

      const { meeting } = await this.meetingMediatorService.createMeeting({ name, createdBy: userId, dueDate, teamId });

      return this.generateCreatedResponse({ meeting });
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeeting", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMeeting(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMeeting called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { meetingId },
      } = this.validationService.validate({ dto: GetMeetingDto, request, getUserIdFromJwt: true });

      const { isMeetingMember } = await this.meetingMediatorService.isMeetingMember({ meetingId, userId: jwtId });

      if (!isMeetingMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { meeting } = await this.meetingMediatorService.getMeeting({ meetingId });

      return this.generateSuccessResponse({ meeting });
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeeting", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async addUserToMeeting(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("addUserToMeeting called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { meetingId },
        body: { userId, role },
      } = this.validationService.validate({ dto: AddUserToMeetingDto, request, getUserIdFromJwt: true });

      const { isMeetingAdmin } = await this.meetingMediatorService.isMeetingAdmin({ meetingId, userId: jwtId });

      if (!isMeetingAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { membership } = await this.meetingMediatorService.addUserToMeeting({ meetingId, userId, role });

      return this.generateSuccessResponse({ membership });
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToMeeting", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async removeUserFromMeeting(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("removeUserFromMeeting called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { meetingId, userId },
      } = this.validationService.validate({ dto: RemoveUserFromMeetingDto, request, getUserIdFromJwt: true });

      const { isMeetingAdmin } = await this.meetingMediatorService.isMeetingAdmin({ meetingId, userId: jwtId });

      if (!isMeetingAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.meetingMediatorService.removeUserFromMeeting({ meetingId, userId });

      return this.generateSuccessResponse({ message: "User removed from group" });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromMeeting", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMeetingsByUserId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMeetingsByUserId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetMeetingsByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { meetings, lastEvaluatedKey } = await this.meetingMediatorService.getMeetingsByUserId({ userId, exclusiveStartKey, limit });

      return this.generateSuccessResponse({ meetings, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByUserId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMeetingsByTeamId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMeetingsByTeamId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { teamId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetMeetingsByTeamIdDto, request, getUserIdFromJwt: true });

      const { isTeamAdmin } = await this.teamMediatorService.isTeamAdmin({ teamId, userId: jwtId });

      if (!isTeamAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { meetings, lastEvaluatedKey } = await this.meetingMediatorService.getMeetingsByTeamId({ teamId, exclusiveStartKey, limit });

      return this.generateSuccessResponse({ meetings, lastEvaluatedKey });
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface MeetingControllerInterface {
  createMeeting(request: Request): Promise<Response>;
  getMeeting(request: Request): Promise<Response>;
  addUserToMeeting(request: Request): Promise<Response>;
  removeUserFromMeeting(request: Request): Promise<Response>;
  getMeetingsByUserId(request: Request): Promise<Response>;
  getMeetingsByTeamId(request: Request): Promise<Response>;
}
