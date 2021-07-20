import { inject, injectable } from "inversify";
import { BadRequestError, LoggerServiceInterface, NotFoundError, WithRole } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { UserServiceInterface, User as UserEntity } from "../entity-services/user.service";
import { TeamUserRelationshipServiceInterface, TeamUserRelationship as TeamUserRelationshipEntity } from "../entity-services/teamUserRelationship.service";
import { UserId } from "../types/userId.type";
import { TeamId } from "../types/teamId.type";
import { GroupId } from "../types/groupId.type";
import { MeetingId } from "../types/meetingId.type";
import { ConversationUserRelationshipServiceInterface } from "../entity-services/conversationUserRelationship.service";
import { IsPropertyUniqueOutput, UniquePropertyServiceInterface } from "../entity-services/uniqueProperty.service";
import { UniqueProperty } from "../enums/uniqueProperty.enum";

@injectable()
export class UserMediatorService implements UserMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.TeamUserRelationshipServiceInterface) private teamUserRelationshipService: TeamUserRelationshipServiceInterface,
    @inject(TYPES.ConversationUserRelationshipServiceInterface) private conversationUserRelationshipService: ConversationUserRelationshipServiceInterface,
    @inject(TYPES.UniquePropertyServiceInterface) private uniquePropertyService: UniquePropertyServiceInterface,
  ) {}

  public async createUser(params: CreateUserInput): Promise<CreateUserOutput> {
    try {
      this.loggerService.trace("createUser called", { params }, this.constructor.name);

      const { email, phone } = params;

      if (!email && !phone) {
        throw new BadRequestError("'email' or 'phone' is required.");
      }

      const [ { isPropertyUnique: isEmailUnique }, { isPropertyUnique: isPhoneUnique } ] = await Promise.all<IsPropertyUniqueOutput | Record<string, never>>([
        email ? this.uniquePropertyService.isPropertyUnique({ property: UniqueProperty.Email, value: email }) : {},
        phone ? this.uniquePropertyService.isPropertyUnique({ property: UniqueProperty.Phone, value: phone }) : {},
      ]);

      if (email && !isEmailUnique) {
        throw new BadRequestError(`User already exists with email ${email}`);
      }

      if (phone && !isPhoneUnique) {
        throw new BadRequestError(`User already exists with phone ${phone}`);
      }

      const { user } = await this.userService.createUser({ email, phone });

      await Promise.all<unknown>([
        email && this.uniquePropertyService.createUniqueProperty({ property: UniqueProperty.Email, value: email, userId: user.id }),
        phone && this.uniquePropertyService.createUniqueProperty({ property: UniqueProperty.Phone, value: phone, userId: user.id }),
      ]);

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in createUser", { error, params }, this.constructor.name);

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

  public async getUserByEmail(params: GetUserByEmailInput): Promise<GetUserByEmailOutput> {
    try {
      this.loggerService.trace("getUserByEmail called", { params }, this.constructor.name);

      const { email } = params;
      let userId: UserId;

      try {
        ({ uniqueProperty: { userId } } = await this.uniquePropertyService.getUniqueProperty({ property: UniqueProperty.Email, value: email }));
      } catch (error) {
        throw new NotFoundError("User not found");
      }

      const { user } = await this.getUser({ userId });

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
      let userId: UserId;

      try {
        ({ uniqueProperty: { userId } } = await this.uniquePropertyService.getUniqueProperty({ property: UniqueProperty.Phone, value: phone }));
      } catch (error) {
        throw new NotFoundError("User not found");
      }

      const { user } = await this.getUser({ userId });

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserByPhone", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByTeamId(params: GetUsersByTeamIdInput): Promise<GetUsersByTeamIdOutput> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey, limit } = params;

      const { teamUserRelationships, lastEvaluatedKey } = await this.teamUserRelationshipService.getTeamUserRelationshipsByTeamId({ teamId, exclusiveStartKey, limit });

      const userIds = teamUserRelationships.map((relationship) => relationship.userId);

      const { users } = await this.userService.getUsers({ userIds });

      const usersWithRoles = users.map((user, i) => ({ ...user, role: teamUserRelationships[i].role }));

      return { users: usersWithRoles, lastEvaluatedKey };
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

      const { users } = await this.userService.getUsers({ userIds });

      const usersWithRoles: WithRole<User>[] = users.map((user, i) => ({ ...user, role: conversationUserRelationships[i].role }));

      return { users: usersWithRoles, lastEvaluatedKey };
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

      const { users } = await this.userService.getUsers({ userIds });

      const usersWithRoles: WithRole<User>[] = users.map((user, i) => ({ ...user, role: conversationUserRelationships[i].role }));

      return { users: usersWithRoles, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByMeetingId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserMediatorServiceInterface {
  createUser(params: CreateUserInput): Promise<CreateUserOutput>;
  getUser(params: GetUserInput): Promise<GetUserOutput>;
  getUserByEmail(params: GetUserByEmailInput): Promise<GetUserByEmailOutput>;
  getUserByPhone(params: GetUserByPhoneInput): Promise<GetUserByPhoneOutput>;
  getUsersByTeamId(params: GetUsersByTeamIdInput): Promise<GetUsersByTeamIdOutput>;
  getUsersByGroupId(params: GetUsersByGroupIdInput): Promise<GetUsersByGroupIdOutput>;
  getUsersByMeetingId(params: GetUsersByMeetingIdInput): Promise<GetUsersByMeetingIdOutput>;
}

export type User = UserEntity;
export type TeamUserRelationship = TeamUserRelationshipEntity;

export interface CreateUserInput {
  email?: string;
  phone?: string;
}

export interface CreateUserOutput {
  user: User;
}

export interface GetUserInput {
  userId: UserId;
}

export interface GetUserOutput {
  user: User;
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
