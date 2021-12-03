import { inject, injectable } from "inversify";
import { LoggerServiceInterface, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { UserServiceInterface, User as UserEntity } from "../entity-services/user.service";
import { TeamUserRelationshipServiceInterface, TeamUserRelationship as TeamUserRelationshipEntity } from "../entity-services/teamUserRelationship.service";
import { UserId } from "../types/userId.type";
import { TeamId } from "../types/teamId.type";
import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
import { ConversationUserRelationshipServiceInterface } from "../entity-services/conversationUserRelationship.service";
import { ImageMimeType } from "../enums/image.mimeType.enum";

@injectable()
export class UserMediatorService implements UserMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.TeamUserRelationshipServiceInterface) private teamUserRelationshipService: TeamUserRelationshipServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
  ) {}

  public async updateUser(params: UpdateUserInput): Promise<UpdateUserOutput> {
    try {
      this.loggerService.trace("updateUser called", { params }, this.constructor.name);

      const { userId, name, bio } = params;

      await this.userService.updateUser({ userId, updates: { name, bio } });

      return;
    } catch (error: unknown) {
      this.loggerService.error("Error in updateUser", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUser(params: GetUserInput): Promise<GetUserOutput> {
    try {
      this.loggerService.trace("getUser called", { params }, this.constructor.name);

      const { userId } = params;

      const { user } = await this.userService.getUser({ userId });

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUser", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getUserImageUploadUrl(params: GetUserImageUploadUrlInput): GetUserImageUploadUrlOutput {
    try {
      this.loggerService.trace("getUserImageUploadUrl called", { params }, this.constructor.name);

      const { userId, mimeType } = params;

      const { uploadUrl } = this.userService.getUserImageUploadUrl({ userId, mimeType });

      return { uploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserImageUploadUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUserByEmail(params: GetUserByEmailInput): Promise<GetUserByEmailOutput> {
    try {
      this.loggerService.trace("getUserByEmail called", { params }, this.constructor.name);

      const { email } = params;

      const { user } = await this.getUserByEmail({ email });

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserByEmail", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUserByPhone(params: GetUserByPhoneInput): Promise<GetUserByPhoneOutput> {
    try {
      this.loggerService.trace("getUserByPhone called", { params }, this.constructor.name);

      const { phone } = params;

      const { user } = await this.getUserByPhone({ phone });

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserByPhone", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUserByUsername(params: GetUserByUsernameInput): Promise<GetUserByUsernameOutput> {
    try {
      this.loggerService.trace("getUserByUsername called", { params }, this.constructor.name);

      const { username } = params;

      const { user } = await this.getUserByUsername({ username });

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserByUsername", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByTeamId(params: GetUsersByTeamIdInput): Promise<GetUsersByTeamIdOutput> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { teamUserRelationships, lastEvaluatedKey } = await this.teamUserRelationshipService.getTeamUserRelationshipsByTeamId({ teamId, exclusiveStartKey, limit });

      const userIds = teamUserRelationships.map((relationship) => relationship.userId);

      const { users: userEntities } = await this.userService.getUsers({ userIds });

      const users = userEntities.map((userEntity, i) => {
        const user: WithRole<User> = {
          ...userEntity,
          role: teamUserRelationships[i].role,
        };

        return user;
      });

      return { users, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByGroupId(params: GetUsersByGroupIdInput): Promise<GetUsersByGroupIdOutput> {
    try {
      this.loggerService.trace("getUsersByGroupId called", { params }, this.constructor.name);

      const { groupId, exclusiveStartKey, limit } = params;

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByConversationId({
        conversationId: groupId,
        exclusiveStartKey,
        limit,
      });

      const userIds = conversationUserRelationships.map((relationship) => relationship.userId);

      const { users: userEntities } = await this.userService.getUsers({ userIds });

      const users = userEntities.map((userEntity, i) => {
        const user: WithRole<User> = {
          ...userEntity,
          role: conversationUserRelationships[i].role,
        };

        return user;
      });

      return { users, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByGroupId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByMeetingId(params: GetUsersByMeetingIdInput): Promise<GetUsersByMeetingIdOutput> {
    try {
      this.loggerService.trace("getUsersByMeetingId called", { params }, this.constructor.name);

      const { meetingId, exclusiveStartKey, limit } = params;

      const { conversationUserRelationships, lastEvaluatedKey } = await this.conversationUserRelationshipService.getConversationUserRelationshipsByConversationId({
        conversationId: meetingId,
        exclusiveStartKey,
        limit,
      });

      const userIds = conversationUserRelationships.map((relationship) => relationship.userId);

      const { users: userEntities } = await this.userService.getUsers({ userIds });

      const users = userEntities.map((userEntity, i) => {
        const user: WithRole<User> = {
          ...userEntity,
          role: conversationUserRelationships[i].role,
        };

        return user;
      });

      return { users, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByMeetingId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserMediatorServiceInterface {
  updateUser(params: UpdateUserInput): Promise<UpdateUserOutput>;
  getUser(params: GetUserInput): Promise<GetUserOutput>;
  getUserByEmail(params: GetUserByEmailInput): Promise<GetUserByEmailOutput>;
  getUserByPhone(params: GetUserByPhoneInput): Promise<GetUserByPhoneOutput>;
  getUserByUsername(params: GetUserByUsernameInput): Promise<GetUserByUsernameOutput>;
  getUserImageUploadUrl(params: GetUserImageUploadUrlInput): GetUserImageUploadUrlOutput;
  getUsersByTeamId(params: GetUsersByTeamIdInput): Promise<GetUsersByTeamIdOutput>;
  getUsersByGroupId(params: GetUsersByGroupIdInput): Promise<GetUsersByGroupIdOutput>;
  getUsersByMeetingId(params: GetUsersByMeetingIdInput): Promise<GetUsersByMeetingIdOutput>;
}

export type User = UserEntity;
export type TeamUserRelationship = TeamUserRelationshipEntity;

interface BaseCreateUserInput {
  email?: string;
  phone?: string;
  username?: string;
  name?: string;
  bio?: string;
}
interface CreateUserEmailRequiredInput extends Omit<BaseCreateUserInput, "email"> {
  email: string;
}

interface CreateUserPhoneRequiredInput extends Omit<BaseCreateUserInput, "phone"> {
  phone: string;
}

export type CreateUserInput = CreateUserEmailRequiredInput | CreateUserPhoneRequiredInput;

export interface CreateUserOutput {
  user: User;
}

export type UpdateUserInput = Pick<User, "name" | "bio"> & {
  userId: UserId;
};

export type UpdateUserOutput = void;
export interface GetUserInput {
  userId: UserId;
}

export interface GetUserOutput {
  user: User;
}

export interface GetUserImageUploadUrlInput {
  userId: UserId;
  mimeType: ImageMimeType;
}

export interface GetUserImageUploadUrlOutput {
  uploadUrl: string;
}

export interface GetUserByEmailInput {
  email: string;
}

export interface GetUserByEmailOutput {
  user: User;
}

export interface GetUserByPhoneInput {
  phone: string;
}

export interface GetUserByPhoneOutput {
  user: User;
}

export interface GetUserByUsernameInput {
  username: string;
}

export interface GetUserByUsernameOutput {
  user: User;
}

export interface GetUsersByTeamIdInput {
  teamId: TeamId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetUsersByTeamIdOutput {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
}

export interface GetUsersByGroupIdInput {
  groupId: GroupId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetUsersByGroupIdOutput {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
}

export interface GetUsersByMeetingIdInput {
  meetingId: MeetingId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetUsersByMeetingIdOutput {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
}
