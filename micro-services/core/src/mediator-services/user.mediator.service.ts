import { inject, injectable } from "inversify";
import { GroupId, LoggerServiceInterface, MeetingId, OrganizationId, TeamId, UserId, WithRole } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { UserServiceInterface, User as UserEntity } from "../entity-services/user.service";
import { TeamMembershipServiceInterface, TeamMembership as TeamMembershipEntity } from "../entity-services/teamMembership.service";
import { GroupMembershipServiceInterface } from "../entity-services/groupMembership.service";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { OrganizationMembershipServiceInterface } from "../entity-services/organizationMembership.service";
import { MeetingMembershipServiceInterface } from "../entity-services/meetingMembership.service";

@injectable()
export class UserMediatorService implements UserMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.TeamMembershipServiceInterface) private teamMembershipService: TeamMembershipServiceInterface,
    @inject(TYPES.GroupMembershipServiceInterface) private groupMembershipService: GroupMembershipServiceInterface,
    @inject(TYPES.MeetingMembershipServiceInterface) private meetingMembershipService: MeetingMembershipServiceInterface,
    @inject(TYPES.OrganizationMembershipServiceInterface) private organizationMembershipService: OrganizationMembershipServiceInterface,
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

  public async getUsersByOrganizationId(params: GetUsersByOrganizationIdInput): Promise<GetUsersByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getUsersByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, exclusiveStartKey, limit } = params;

      const { organizationMemberships, lastEvaluatedKey } = await this.organizationMembershipService.getOrganizationMembershipsByOrganizationId({ organizationId, exclusiveStartKey, limit });

      const userIds = organizationMemberships.map((relationship) => relationship.userId);

      const { users: userEntities } = await this.userService.getUsers({ userIds });

      const users = userEntities.map((userEntity, i) => {
        const user: WithRole<User> = {
          ...userEntity,
          role: organizationMemberships[i].role,
        };

        return user;
      });

      return { users, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByTeamId(params: GetUsersByTeamIdInput): Promise<GetUsersByTeamIdOutput> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { teamMemberships, lastEvaluatedKey } = await this.teamMembershipService.getTeamMembershipsByTeamId({ teamId, exclusiveStartKey, limit });

      const userIds = teamMemberships.map((relationship) => relationship.userId);

      const { users: userEntities } = await this.userService.getUsers({ userIds });

      const users = userEntities.map((userEntity, i) => {
        const user: WithRole<User> = {
          ...userEntity,
          role: teamMemberships[i].role,
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

      const { groupMemberships, lastEvaluatedKey } = await this.groupMembershipService.getGroupMembershipsByGroupId({
        groupId,
        exclusiveStartKey,
        limit,
      });

      const userIds = groupMemberships.map((membership) => membership.userId);

      const { users: userEntities } = await this.userService.getUsers({ userIds });

      const users = userEntities.map((userEntity, i) => {
        const user: WithRole<User> = {
          ...userEntity,
          role: groupMemberships[i].role,
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

      const { meetingMemberships, lastEvaluatedKey } = await this.meetingMembershipService.getMeetingMembershipsByMeetingId({
        meetingId,
        exclusiveStartKey,
        limit,
      });

      const userIds = meetingMemberships.map((membership) => membership.userId);

      const { users: userEntities } = await this.userService.getUsers({ userIds });

      const users = userEntities.map((userEntity, i) => {
        const user: WithRole<User> = {
          ...userEntity,
          role: meetingMemberships[i].role,
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
  getUsersByOrganizationId(params: GetUsersByOrganizationIdInput): Promise<GetUsersByOrganizationIdOutput>;
  getUsersByTeamId(params: GetUsersByTeamIdInput): Promise<GetUsersByTeamIdOutput>;
  getUsersByGroupId(params: GetUsersByGroupIdInput): Promise<GetUsersByGroupIdOutput>;
  getUsersByMeetingId(params: GetUsersByMeetingIdInput): Promise<GetUsersByMeetingIdOutput>;
}

export type User = UserEntity;
export type TeamMembership = TeamMembershipEntity;

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

export interface GetUsersByOrganizationIdInput {
  organizationId: OrganizationId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetUsersByOrganizationIdOutput {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
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
