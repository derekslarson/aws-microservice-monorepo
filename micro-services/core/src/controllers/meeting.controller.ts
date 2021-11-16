import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface, Meeting, WithRole, User } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { CreateMeetingDto } from "../dtos/createMeeting.dto";
import { GetMeetingDto } from "../dtos/getMeeting.dto";
import { AddUsersToMeetingDto } from "../dtos/addUsersToMeeting.dto";
import { RemoveUserFromMeetingDto } from "../dtos/removeUserFromMeeting.dto";
import { GetMeetingsByUserIdDto } from "../dtos/getMeetingsByUserId.dto";
import { GetMeetingsByTeamIdDto } from "../dtos/getMeetingsByTeamId.dto";
import { TeamMediatorServiceInterface } from "../mediator-services/team.mediator.service";
import { GetMeetingImageUploadUrlDto } from "../dtos/getMeetingImageUploadUrl.dto";
import { AddUsersToMeetingInput, InvitationOrchestratorServiceInterface } from "../orchestrator-services/invitation.orchestrator.service";
import { UpdateMeetingDto } from "../dtos/updateMeeting.dto";

@injectable()
export class MeetingController extends BaseController implements MeetingControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.InvitationOrchestratorServiceInterface) private invitationOrchestratorService: InvitationOrchestratorServiceInterface,
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

      const response: CreateMeetingResponse = { meeting };

      return this.generateCreatedResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeeting", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async updateMeeting(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("updateMeeting called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { meetingId },
        body,
      } = this.validationService.validate({ dto: UpdateMeetingDto, request, getUserIdFromJwt: true });

      const { isMeetingAdmin } = await this.meetingMediatorService.isMeetingAdmin({ meetingId, userId: jwtId });

      if (!isMeetingAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.meetingMediatorService.updateMeeting({ meetingId, updates: body });

      const response: UpdateMeetingResponse = { message: "Meeting updated." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in updateMeeting", { error, request }, this.constructor.name);

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

      const response: GetMeetingResponse = { meeting };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeeting", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMeetingImageUploadUrl(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMeetingImageUploadUrl called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { meetingId },
        queryStringParameters: { mime_type: mimeType },
      } = this.validationService.validate({ dto: GetMeetingImageUploadUrlDto, request, getUserIdFromJwt: true });

      const { isMeetingAdmin } = await this.meetingMediatorService.isMeetingAdmin({ meetingId, userId: jwtId });

      if (!isMeetingAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { uploadUrl } = this.meetingMediatorService.getMeetingImageUploadUrl({ meetingId, mimeType });

      const response: GetMeetingImageUploadUrlResponse = { uploadUrl };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingImageUploadUrl", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async addUsersToMeeting(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("addUsersToMeeting called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { meetingId },
        body: { users },
      } = this.validationService.validate({ dto: AddUsersToMeetingDto, request, getUserIdFromJwt: true });

      const { isMeetingAdmin } = await this.meetingMediatorService.isMeetingAdmin({ meetingId, userId: jwtId });

      if (!isMeetingAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { successes, failures } = await this.invitationOrchestratorService.addUsersToMeeting({ meetingId, users });

      const response: AddUsersToMeetingResponse = {
        message: `Users added to meeting${failures.length ? ", but with some failures." : "."}`,
        successes,
        ...(failures.length && { failures }),
      };

      return this.generateSuccessResponse(response);
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

      const response: RemoveUserFromMeetingResponse = { message: "User removed from meeting." };

      return this.generateSuccessResponse(response);
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
        queryStringParameters: { exclusiveStartKey, limit, sortBy },
      } = this.validationService.validate({ dto: GetMeetingsByUserIdDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      const { meetings, lastEvaluatedKey } = await this.meetingMediatorService.getMeetingsByUserId({
        userId,
        sortBy,
        exclusiveStartKey,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      const response: GetMeetingsByUserIdResponse = { meetings, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
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

      const { isTeamMember } = await this.teamMediatorService.isTeamMember({ teamId, userId: jwtId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { meetings, lastEvaluatedKey } = await this.meetingMediatorService.getMeetingsByTeamId({ teamId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetMeetingsByTeamIdResponse = { meetings, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface MeetingControllerInterface {
  createMeeting(request: Request): Promise<Response>;
  updateMeeting(request: Request): Promise<Response>;
  getMeeting(request: Request): Promise<Response>;
  addUsersToMeeting(request: Request): Promise<Response>;
  removeUserFromMeeting(request: Request): Promise<Response>;
  getMeetingImageUploadUrl(request: Request): Promise<Response>;
  getMeetingsByUserId(request: Request): Promise<Response>;
  getMeetingsByTeamId(request: Request): Promise<Response>;
}

interface CreateMeetingResponse {
  meeting: Meeting;
}

interface UpdateMeetingResponse {
  message: "Meeting updated.";
}

interface GetMeetingResponse {
  meeting: Meeting;
}

interface GetMeetingImageUploadUrlResponse {
  uploadUrl: string;
}

interface AddUsersToMeetingResponse {
  message: string;
  successes?: User[];
  failures?: AddUsersToMeetingInput["users"];
}

interface RemoveUserFromMeetingResponse {
  message: string;
}

interface GetMeetingsByUserIdResponse {
  meetings: WithRole<Meeting>[];
  lastEvaluatedKey?: string;
}

interface GetMeetingsByTeamIdResponse {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}
