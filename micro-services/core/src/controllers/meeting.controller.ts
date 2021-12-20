import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface, Meeting, MeetingByUserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { CreateMeetingDto } from "../dtos/createMeeting.dto";
import { GetMeetingDto } from "../dtos/getMeeting.dto";
import { AddUsersToMeetingDto } from "../dtos/addUsersToMeeting.dto";
import { RemoveUserFromMeetingDto } from "../dtos/removeUserFromMeeting.dto";
import { GetMeetingsByUserIdDto } from "../dtos/getMeetingsByUserId.dto";
import { GetMeetingsByTeamIdDto } from "../dtos/getMeetingsByTeamId.dto";
import { GetMeetingImageUploadUrlDto } from "../dtos/getMeetingImageUploadUrl.dto";
import { UpdateMeetingDto } from "../dtos/updateMeeting.dto";
import { GetMeetingsByOrganizationIdDto } from "../dtos/getMeetingsByOrganizationId.dto";
import { AddUsersToMeetingOutput, InvitationServiceInterface } from "../services/tier-2/invitation.service";
import { OrganizationServiceInterface } from "../services/tier-1/organization.service";
import { MeetingServiceInterface } from "../services/tier-1/meeting.service";
import { ConversationServiceInterface } from "../services/tier-3/conversation.service";
import { TeamServiceInterface } from "../services/tier-1/team.service";

@injectable()
export class MeetingController extends BaseController implements MeetingControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.InvitationServiceInterface) private invitationService: InvitationServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private meetingService: MeetingServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.TeamServiceInterface) private teamService: TeamServiceInterface,
  ) {
    super();
  }

  public async createMeeting(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("createMeeting called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId },
        body: { name, teamId, dueAt },
      } = this.validationService.validate({ dto: CreateMeetingDto, request, getUserIdFromJwt: true });

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

      const { meeting } = await this.meetingService.createMeeting({ name, createdBy: jwtId, dueAt, organizationId, teamId });

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

      const { isMeetingAdmin } = await this.meetingService.isMeetingAdmin({ meetingId, userId: jwtId });

      if (!isMeetingAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.meetingService.updateMeeting({ meetingId, updates: body });

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

      const { isMeetingMember } = await this.meetingService.isMeetingMember({ meetingId, userId: jwtId });

      if (!isMeetingMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { meeting } = await this.meetingService.getMeeting({ meetingId });

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

      const { isMeetingAdmin } = await this.meetingService.isMeetingAdmin({ meetingId, userId: jwtId });

      if (!isMeetingAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { uploadUrl } = this.meetingService.getMeetingImageUploadUrl({ meetingId, mimeType });

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

      const { isMeetingAdmin } = await this.meetingService.isMeetingAdmin({ meetingId, userId: jwtId });

      if (!isMeetingAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { successes, failures } = await this.invitationService.addUsersToMeeting({ meetingId, users });

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

      const { isMeetingAdmin } = await this.meetingService.isMeetingAdmin({ meetingId, userId: jwtId });

      if (!isMeetingAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      await this.meetingService.removeUserFromMeeting({ meetingId, userId });

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

      const { meetings, lastEvaluatedKey } = await this.conversationService.getMeetingsByUserId({
        userId,
        sortByDueAt: sortBy === "dueAt",
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

      const { isTeamMember } = await this.teamService.isTeamMember({ teamId, userId: jwtId });

      if (!isTeamMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { meetings, lastEvaluatedKey } = await this.conversationService.getMeetingsByTeamId({ teamId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetMeetingsByTeamIdResponse = { meetings, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByTeamId", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async getMeetingsByOrganizationId(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getMeetingsByOrganizationId called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId },
        queryStringParameters: { exclusiveStartKey, limit },
      } = this.validationService.validate({ dto: GetMeetingsByOrganizationIdDto, request, getUserIdFromJwt: true });

      const { isOrganizationMember } = await this.organizationService.isOrganizationMember({ organizationId, userId: jwtId });

      if (!isOrganizationMember) {
        throw new ForbiddenError("Forbidden");
      }

      const { meetings, lastEvaluatedKey } = await this.conversationService.getMeetingsByOrganizationId({ organizationId, exclusiveStartKey, limit: limit ? parseInt(limit, 10) : undefined });

      const response: GetMeetingsByOrganizationIdResponse = { meetings, lastEvaluatedKey };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByOrganizationId", { error, request }, this.constructor.name);

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
  getMeetingsByOrganizationId(request: Request): Promise<Response>;
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
  successes?: AddUsersToMeetingOutput["failures"];
  failures?: AddUsersToMeetingOutput["failures"];
}

interface RemoveUserFromMeetingResponse {
  message: string;
}

interface GetMeetingsByUserIdResponse {
  meetings: MeetingByUserId[];
  lastEvaluatedKey?: string;
}

interface GetMeetingsByTeamIdResponse {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

interface GetMeetingsByOrganizationIdResponse {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}
