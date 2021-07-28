import { inject, injectable } from "inversify";
import { LoggerServiceInterface, NotFoundError, Role, WithRole } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationServiceInterface, MeetingConversation } from "../entity-services/conversation.service";
import { ConversationUserRelationshipServiceInterface } from "../entity-services/conversationUserRelationship.service";
import { UserId } from "../types/userId.type";
import { TeamId } from "../types/teamId.type";
import { MeetingId } from "../types/meetingId.type";
import { ConversationType } from "../enums/conversationType.enum";
import { ImageFileServiceInterface } from "../entity-services/image.file.service";
import { EntityType } from "../enums/entityType.enum";
import { ConversationFetchType } from "../enums/conversationFetchType.enum";
import { ImageMimeType } from "../enums/image.mimeType.enum";

@injectable()
export class MeetingMediatorService implements MeetingMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ConversationServiceInterface) private conversationService: ConversationServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
    @inject(TYPES.ImageFileServiceInterface) private imageFileService: ImageFileServiceInterface,
  ) {}

  public async createMeeting(params: CreateMeetingInput): Promise<CreateMeetingOutput> {
    try {
      this.loggerService.trace("createMeeting called", { params }, this.constructor.name);

      const { name, createdBy, dueDate, teamId } = params;

      const { image, mimeType } = this.imageFileService.createDefaultImage();

      const { conversation: meetingEntity } = await this.conversationService.createMeetingConversation({
        imageMimeType: mimeType,
        name,
        createdBy,
        dueDate,
        teamId,
      });

      await Promise.all([
        this.imageFileService.uploadFile({ entityType: EntityType.MeetingConversation, entityId: meetingEntity.id, file: image, mimeType }),
        this.conversationUserRelationshipService.createConversationUserRelationship({ type: ConversationType.Meeting, userId: createdBy, conversationId: meetingEntity.id, role: Role.Admin, dueDate }),
      ]);

      const { signedUrl } = this.imageFileService.getSignedUrl({
        operation: "get",
        entityType: EntityType.MeetingConversation,
        entityId: meetingEntity.id,
        mimeType: meetingEntity.imageMimeType,
      });

      const { type, imageMimeType, ...restOfMeetingEntity } = meetingEntity;

      const meeting: Meeting = {
        ...restOfMeetingEntity,
        image: signedUrl,
      };

      return { meeting };
    } catch (error: unknown) {
      this.loggerService.error("Error in createMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeeting(params: GetMeetingInput): Promise<GetMeetingOutput> {
    try {
      this.loggerService.trace("getMeeting called", { params }, this.constructor.name);

      const { meetingId } = params;

      const { conversation: meetingEntity } = await this.conversationService.getConversation({ conversationId: meetingId });

      const { signedUrl } = this.imageFileService.getSignedUrl({
        operation: "get",
        entityType: EntityType.MeetingConversation,
        entityId: meetingEntity.id,
        mimeType: meetingEntity.imageMimeType,
      });

      const { type, imageMimeType, ...restOfMeetingEntity } = meetingEntity;

      const meeting: Meeting = {
        ...restOfMeetingEntity,
        image: signedUrl,
      };

      return { meeting };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getMeetingImageUploadUrl(params: GetMeetingImageUploadUrlInput): GetMeetingImageUploadUrlOutput {
    try {
      this.loggerService.trace("getMeetingImageUploadUrl called", { params }, this.constructor.name);

      const { meetingId, mimeType } = params;

      const { signedUrl: uploadUrl } = this.imageFileService.getSignedUrl({
        operation: "upload",
        entityType: EntityType.MeetingConversation,
        entityId: meetingId,
        mimeType,
      });

      return { uploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingImageUploadUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteMeeting(params: DeleteMeetingInput): Promise<DeleteMeetingOutput> {
    try {
      this.loggerService.trace("deleteMeeting called", { params }, this.constructor.name);

      const { meetingId } = params;

      const { conversationUserRelationships } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByConversationId({ conversationId: meetingId });

      const userIds = conversationUserRelationships.map((relationship) => relationship.userId);

      await Promise.all(userIds.map((userId) => this.conversationUserRelationshipService.deleteConversationUserRelationship({ userId, conversationId: meetingId })));

      await this.conversationService.deleteConversation({ conversationId: meetingId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToMeeting(params: AddUserToMeetingInput): Promise<AddUserToMeetingOutput> {
    try {
      this.loggerService.trace("addUserToMeeting called", { params }, this.constructor.name);

      const { meetingId, userId, role } = params;

      const { meeting } = await this.getMeeting({ meetingId });

      await this.conversationUserRelationshipService.createConversationUserRelationship({
        type: ConversationType.Meeting,
        conversationId: meetingId,
        dueDate: meeting.dueDate,
        userId,
        role,
      });

      const membership: Membership = {
        meetingId,
        userId,
        role,
      };

      return { membership };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromMeeting(params: RemoveUserFromMeetingInput): Promise<RemoveUserFromMeetingOutput> {
    try {
      this.loggerService.trace("removeUserFromMeeting called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      await this.conversationUserRelationshipService.deleteConversationUserRelationship({
        conversationId: meetingId,
        userId,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromMeeting", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByUserId called", { params }, this.constructor.name);

      const { userId, exclusiveStartKey, limit, sortBy = "updatedAt" } = params;

      const sortByToTypeMap: Record<"dueDate" | "updatedAt", ConversationFetchType.MeetingDueDate | ConversationFetchType.Meeting> = {
        dueDate: ConversationFetchType.MeetingDueDate,
        updatedAt: ConversationFetchType.Meeting,
      };

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByUserId({
        userId,
        type: sortByToTypeMap[sortBy],
        exclusiveStartKey,
        limit,
      });

      const meetingIds = conversationUserRelationships.map((relationship) => relationship.conversationId);

      const { conversations: meetingEntities } = await this.conversationService.getConversations({ conversationIds: meetingIds });

      const meetings = meetingEntities.map((meetingEntity, i) => {
        const { signedUrl } = this.imageFileService.getSignedUrl({
          operation: "get",
          entityType: EntityType.MeetingConversation,
          entityId: meetingEntity.id,
          mimeType: meetingEntity.imageMimeType,
        });

        const { type, imageMimeType, ...restOfMeetingEntity } = meetingEntity;

        return {
          ...restOfMeetingEntity,
          image: signedUrl,
          role: conversationUserRelationships[i].role,
        };
      });

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { conversations: meetingEntities, lastEvaluatedKey } = await this.conversationService.getConversationsByTeamId({
        teamId,
        type: ConversationType.Meeting,
        exclusiveStartKey,
        limit,
      });

      const meetings = meetingEntities.map((meetingEntity) => {
        const { signedUrl } = this.imageFileService.getSignedUrl({
          operation: "get",
          entityType: EntityType.MeetingConversation,
          entityId: meetingEntity.id,
          mimeType: meetingEntity.imageMimeType,
        });

        const { type, imageMimeType, ...restOfMeetingEntity } = meetingEntity;

        return {
          ...restOfMeetingEntity,
          image: signedUrl,
        };
      });

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isMeetingMember(params: IsMeetingMemberInput): Promise<IsMeetingMemberOutput> {
    try {
      this.loggerService.trace("isMeetingMember called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      await this.conversationUserRelationshipService.getConversationUserRelationship({
        conversationId: meetingId,
        userId,
      });

      return { isMeetingMember: true };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isMeetingMember: false };
      }
      this.loggerService.error("Error in isMeetingMember", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isMeetingAdmin(params: IsMeetingAdminInput): Promise<IsMeetingAdminOutput> {
    try {
      this.loggerService.trace("isMeetingAdmin called", { params }, this.constructor.name);

      const { meetingId, userId } = params;

      const { conversationUserRelationship } = await this.conversationUserRelationshipService.getConversationUserRelationship({
        conversationId: meetingId,
        userId,
      });

      return { isMeetingAdmin: conversationUserRelationship.role === Role.Admin };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isMeetingAdmin: false };
      }
      this.loggerService.error("Error in isMeetingAdmin", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface MeetingMediatorServiceInterface {
  createMeeting(params: CreateMeetingInput): Promise<CreateMeetingOutput>;
  getMeeting(params: GetMeetingInput): Promise<GetMeetingOutput>
  deleteMeeting(params: DeleteMeetingInput): Promise<DeleteMeetingOutput>;
  addUserToMeeting(params: AddUserToMeetingInput): Promise<AddUserToMeetingOutput>;
  removeUserFromMeeting(params: RemoveUserFromMeetingInput): Promise<RemoveUserFromMeetingOutput>;
  getMeetingImageUploadUrl(params: GetMeetingImageUploadUrlInput): GetMeetingImageUploadUrlOutput;
  getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput>;
  getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput>;
  isMeetingMember(params: IsMeetingMemberInput): Promise<IsMeetingMemberOutput>;
  isMeetingAdmin(params: IsMeetingAdminInput): Promise<IsMeetingAdminOutput>;
}

export interface Meeting extends Omit<MeetingConversation, "type" | "imageMimeType"> {
  image: string;
}

export interface Membership { meetingId: MeetingId; userId: UserId; role: Role; }

export interface CreateMeetingInput {
  name: string;
  createdBy: UserId;
  dueDate: string;
  teamId?: TeamId;
}

export interface CreateMeetingOutput {
  meeting: Meeting;
}

export interface GetMeetingInput {
  meetingId: MeetingId;
}

export interface GetMeetingOutput {
  meeting: Meeting;
}

export interface GetMeetingImageUploadUrlInput {
  meetingId: MeetingId;
  mimeType: ImageMimeType;
}

export interface GetMeetingImageUploadUrlOutput {
  uploadUrl: string;
}

export interface DeleteMeetingInput {
  meetingId: MeetingId;
}

export type DeleteMeetingOutput = void;

export interface AddUserToMeetingInput {
  meetingId: MeetingId;
  userId: UserId;
  role: Role;
}

export interface AddUserToMeetingOutput {
  membership: Membership;
}

export interface RemoveUserFromMeetingInput {
  meetingId: MeetingId;
  userId: UserId;
}

export type RemoveUserFromMeetingOutput = void;

export interface GetMeetingsByUserIdInput {
  userId: UserId;
  sortBy?: "dueDate" | "updatedAt";
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByUserIdOutput {
  meetings: WithRole<Meeting>[];
  lastEvaluatedKey?: string;
}

export interface GetMeetingsByTeamIdInput {
  teamId: TeamId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByTeamIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

export interface IsMeetingMemberInput {
  meetingId: MeetingId;
  userId: UserId;
}

export interface IsMeetingMemberOutput {
  isMeetingMember: boolean;
}

export interface IsMeetingAdminInput {
  meetingId: MeetingId;
  userId: UserId;
}

export interface IsMeetingAdminOutput {
  isMeetingAdmin: boolean;
}
