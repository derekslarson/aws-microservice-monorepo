/* eslint-disable no-return-assign */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserId } from "@yac/util/src/types/userId.type";
import { GroupId } from "@yac/util/src/types/groupId.type";
import { ConversationId } from "@yac/util/src/types/conversationId.type";
import { ConversationType } from "@yac/util/src/enums/conversationType.enum";
import { OneOnOneId } from "@yac/util/src/types/oneOnOneId.type";
import { MeetingId } from "@yac/util/src/types/meetingId.type";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import { TeamId } from "@yac/util/src/types/teamId.type";
import { NotFoundError } from "@yac/util/src/errors/notFound.error";
import { TYPES } from "../../inversion-of-control/types";
import { Meeting as MeetingEntity, MeetingByUserId as MeetingByUserIdEntity, MeetingServiceInterface } from "../tier-1/meeting.service";
import { Group as GroupEntity, GroupByUserId as GroupByUserIdEntity, GroupServiceInterface } from "../tier-1/group.service";
import { OneOnOne as OneOnOneEntity, OneOnOneByUserId as OneOnOneByUserIdEntity, OneOnOneServiceInterface } from "../tier-1/oneOnOne.service";
import { Message as MessageEntity, MessageServiceInterface } from "../tier-2/message.service";
import { User as UserEntity, UserServiceInterface } from "../tier-1/user.service";
import { MembershipRepositoryInterface } from "../../repositories/membership.dynamo.repository";
import { OneOnOneAndGroupServiceInterface } from "../tier-2/oneOnOneAndGroup.service";
import { KeyPrefix } from "../../enums/keyPrefix.enum";

@injectable()
export class ConversationService implements ConversationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private meetingService: MeetingServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
    @inject(TYPES.OneOnOneServiceInterface) private oneOnOneService: OneOnOneServiceInterface,
    @inject(TYPES.OneOnOneAndGroupServiceInterface) private oneOnOneAndGroupService: OneOnOneAndGroupServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.MembershipRepositoryInterface) private membershipRepository: MembershipRepositoryInterface,
  ) {}

  public async getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByUserId called", { params }, this.constructor.name);

      const { userId, searchTerm, sortByDueAt, limit, exclusiveStartKey } = params;

      const { meetings: meetingEntities, lastEvaluatedKey } = await this.meetingService.getMeetingsByUserId({ userId, searchTerm, sortByDueAt, limit, exclusiveStartKey });

      const meetings = await Promise.all(meetingEntities.map(async (meetingEntity) => {
        const { messages: [ recentMessage ] } = await this.messageService.getMessagesByConversationId({ requestingUserId: userId, conversationId: meetingEntity.id });

        return { ...meetingEntity, recentMessage };
      }));

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByTeamId called", { params }, this.constructor.name);

      const { teamId, searchTerm, sortByDueAt, limit, exclusiveStartKey } = params;

      const { meetings: meetingEntities, lastEvaluatedKey } = await this.meetingService.getMeetingsByTeamId({ teamId, searchTerm, sortByDueAt, limit, exclusiveStartKey });

      const meetings = await Promise.all(meetingEntities.map(async (meetingEntity) => {
        const { messages: [ recentMessage ] } = await this.messageService.getMessagesByConversationId({ conversationId: meetingEntity.id });

        return { ...meetingEntity, recentMessage };
      }));

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getMeetingsByOrganizationId(params: GetMeetingsByOrganizationIdInput): Promise<GetMeetingsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getMeetingsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, searchTerm, sortByDueAt, limit, exclusiveStartKey } = params;

      const { meetings: meetingEntities, lastEvaluatedKey } = await this.meetingService.getMeetingsByOrganizationId({ organizationId, searchTerm, sortByDueAt, limit, exclusiveStartKey });

      const meetings = await Promise.all(meetingEntities.map(async (meetingEntity) => {
        const { messages: [ recentMessage ] } = await this.messageService.getMessagesByConversationId({ conversationId: meetingEntity.id });

        return { ...meetingEntity, recentMessage };
      }));

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getMeetingsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupsByUserId(params: GetGroupsByUserIdInput): Promise<GetGroupsByUserIdOutput> {
    try {
      this.loggerService.trace("getGroupsByUserId called", { params }, this.constructor.name);

      const { userId, searchTerm, limit, exclusiveStartKey } = params;

      const { groups: groupEntities, lastEvaluatedKey } = await this.groupService.getGroupsByUserId({ userId, searchTerm, limit, exclusiveStartKey });

      const groups = await Promise.all(groupEntities.map(async (groupEntity) => {
        const { messages: [ recentMessage ] } = await this.messageService.getMessagesByConversationId({ requestingUserId: userId, conversationId: groupEntity.id });

        return { ...groupEntity, recentMessage };
      }));

      return { groups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupsByTeamId(params: GetGroupsByTeamIdInput): Promise<GetGroupsByTeamIdOutput> {
    try {
      this.loggerService.trace("getGroupsByTeamId called", { params }, this.constructor.name);

      const { teamId, searchTerm, limit, exclusiveStartKey } = params;

      const { groups: groupEntities, lastEvaluatedKey } = await this.groupService.getGroupsByTeamId({ teamId, searchTerm, limit, exclusiveStartKey });

      const groups = await Promise.all(groupEntities.map(async (groupEntity) => {
        const { messages: [ recentMessage ] } = await this.messageService.getMessagesByConversationId({ conversationId: groupEntity.id });

        return { ...groupEntity, recentMessage };
      }));

      return { groups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupsByOrganizationId(params: GetGroupsByOrganizationIdInput): Promise<GetGroupsByOrganizationIdOutput> {
    try {
      this.loggerService.trace("getGroupsByOrganizationId called", { params }, this.constructor.name);

      const { organizationId, searchTerm, limit, exclusiveStartKey } = params;

      const { groups: groupEntities, lastEvaluatedKey } = await this.groupService.getGroupsByOrganizationId({ organizationId, searchTerm, limit, exclusiveStartKey });

      const groups = await Promise.all(groupEntities.map(async (groupEntity) => {
        const { messages: [ recentMessage ] } = await this.messageService.getMessagesByConversationId({ conversationId: groupEntity.id });

        return { ...groupEntity, recentMessage };
      }));

      return { groups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByOrganizationId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOnesByUserId(params: GetOneOnOnesByUserIdInput): Promise<GetOneOnOnesByUserIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnessByUserId called", { params }, this.constructor.name);

      const { userId, searchTerm, limit, exclusiveStartKey } = params;

      const { oneOnOnes: oneOnOneEntities, lastEvaluatedKey } = await this.oneOnOneService.getOneOnOnesByUserId({ userId, searchTerm, limit, exclusiveStartKey });

      const userIds = oneOnOneEntities.map(({ createdBy, otherUserId }) => (userId === createdBy ? otherUserId : createdBy));

      const { users: otherUsers } = await this.userService.getUsers({ userIds });

      const oneOnOnes = await Promise.all(oneOnOneEntities.map(async (oneOnOneEntity, i) => {
        const { messages: [ recentMessage ] } = await this.messageService.getMessagesByConversationId({ requestingUserId: userId, conversationId: oneOnOneEntity.id });

        return {
          ...oneOnOneEntity,
          recentMessage,
          name: otherUsers[i].name,
          username: otherUsers[i].username,
          email: otherUsers[i].email,
          phone: otherUsers[i].phone,
          image: otherUsers[i].image,
        };
      }));

      return { oneOnOnes, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOnesAndGroupsByUserId(params: GetOneOnOnesAndGroupsByUserIdInput): Promise<GetOneOnOnesAndGroupsByUserIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnesAndGroupsByUserId called", { params }, this.constructor.name);

      const { userId, searchTerm, limit, exclusiveStartKey } = params;

      const { oneOnOnesAndGroups: oneOnOneAndGroupEntities, lastEvaluatedKey } = await this.oneOnOneAndGroupService.getOneOnOnesAndGroupsByUserId({ userId, searchTerm, limit, exclusiveStartKey });

      const oneOnOneEntities = oneOnOneAndGroupEntities.filter((oneOnOneOrGroup) => !oneOnOneOrGroup.id.startsWith(KeyPrefix.Group)) as OneOnOneByUserIdEntity [];
      const userIds = oneOnOneEntities.map(({ createdBy, otherUserId }) => (userId === createdBy ? otherUserId : createdBy));

      const { users } = await this.userService.getUsers({ userIds });

      const userMap: Record<string, UserEntity> = {};
      users.forEach((user) => userMap[user.id] = user);

      const oneOnOnesAndGroups = await Promise.all(oneOnOneAndGroupEntities.map(async (oneOnOneOrGroupEntity) => {
        const { messages: [ recentMessage ] } = await this.messageService.getMessagesByConversationId({ requestingUserId: userId, conversationId: oneOnOneOrGroupEntity.id });

        if (oneOnOneOrGroupEntity.id.startsWith(KeyPrefix.Group)) {
          return { ...oneOnOneOrGroupEntity as GroupByUserIdEntity, recentMessage };
        }

        const otherUserId = oneOnOneOrGroupEntity.id.split(/_(?=user_)/).find((id) => id !== userId) as UserId;
        const otherUser = userMap[otherUserId];

        return {
          ...oneOnOneOrGroupEntity as OneOnOneByUserIdEntity,
          recentMessage,
          name: otherUser.name,
          username: otherUser.username,
          email: otherUser.email,
          phone: otherUser.phone,
          image: otherUser.image,
        };
      }));

      return { oneOnOnesAndGroups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesAndGroupsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async isConversationMember(params: IsConversationMemberInput): Promise<IsConversationMemberOutput> {
    try {
      this.loggerService.trace("isConversationMember called", { params }, this.constructor.name);

      const { conversationId, userId } = params;

      await this.membershipRepository.getMembership({ entityId: conversationId, userId });

      return { isConversationMember: true };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isConversationMember: false };
      }
      this.loggerService.error("Error in isConversationMember", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationServiceInterface {
  getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput>;
  getMeetingsByTeamId(params: GetMeetingsByTeamIdInput): Promise<GetMeetingsByTeamIdOutput>;
  getMeetingsByOrganizationId(params: GetMeetingsByOrganizationIdInput): Promise<GetMeetingsByOrganizationIdOutput>;
  getGroupsByUserId(params: GetGroupsByUserIdInput): Promise<GetGroupsByUserIdOutput>;
  getGroupsByTeamId(params: GetGroupsByTeamIdInput): Promise<GetGroupsByTeamIdOutput>;
  getGroupsByOrganizationId(params: GetGroupsByOrganizationIdInput): Promise<GetGroupsByTeamIdOutput>;
  getOneOnOnesByUserId(params: GetOneOnOnesByUserIdInput): Promise<GetOneOnOnesByUserIdOutput>;
  getOneOnOnesAndGroupsByUserId(params: GetOneOnOnesAndGroupsByUserIdInput): Promise<GetOneOnOnesAndGroupsByUserIdOutput>;
  isConversationMember(params: IsConversationMemberInput): Promise<IsConversationMemberOutput>
}

export type Message<T extends ConversationId | void = void> = Omit<MessageEntity, "from"> & {
  type: ConversationType;
  from: UserEntity;
  to: T extends OneOnOneId ? UserEntity : T extends GroupId ? GroupEntity : T extends MeetingId ? MeetingEntity : UserEntity | GroupEntity | MeetingEntity;
};

export type Meeting = MeetingEntity & {
  recentMessage?: Message;
};

export type Group = GroupEntity & {
  recentMessage?: Message;
};

export type OneOnOne = OneOnOneEntity & Pick<UserEntity, "name" | "username" | "email" | "phone" | "image"> & {
  recentMessage?: Message;
};

export type MeetingByUserId = MeetingByUserIdEntity & {
  recentMessage?: Message;
};

export type GroupByUserId = GroupByUserIdEntity & {
  recentMessage?: Message;
};

export type OneOnOneByUserId = OneOnOneByUserIdEntity & Pick<UserEntity, "name" | "username" | "email" | "phone" | "image"> & {
  recentMessage?: Message;
};

export interface GetMeetingsByUserIdInput {
  userId: UserId;
  searchTerm?: string;
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByUserIdOutput {
  meetings: MeetingByUserId[];
  lastEvaluatedKey?: string;
}

export interface GetMeetingsByTeamIdInput {
  teamId: TeamId;
  searchTerm?: string;
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByTeamIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

export interface GetMeetingsByOrganizationIdInput {
  organizationId: OrganizationId;
  searchTerm?: string;
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByOrganizationIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

export interface GetGroupsByUserIdInput {
  userId: UserId;
  searchTerm?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsByUserIdOutput {
  groups: GroupByUserId[];
  lastEvaluatedKey?: string;
}

export interface GetGroupsByTeamIdInput {
  teamId: TeamId;
  searchTerm?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsByTeamIdOutput {
  groups: Group[];
  lastEvaluatedKey?: string;
}

export interface GetGroupsByOrganizationIdInput {
  organizationId: OrganizationId;
  searchTerm?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsByOrganizationIdOutput {
  groups: Group[];
  lastEvaluatedKey?: string;
}

export interface GetOneOnOnesByUserIdInput {
  userId: UserId;
  searchTerm?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOneOnOnesByUserIdOutput {
  oneOnOnes: OneOnOneByUserId[];
  lastEvaluatedKey?: string;
}

export interface GetOneOnOnesAndGroupsByUserIdInput {
  userId: UserId;
  searchTerm?: string;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOneOnOnesAndGroupsByUserIdOutput {
  oneOnOnesAndGroups: (Group | OneOnOne)[];
  lastEvaluatedKey?: string;
}

export interface IsConversationMemberInput {
  userId: UserId;
  conversationId: ConversationId;
}

export interface IsConversationMemberOutput {
  isConversationMember: boolean;
}

export interface GetMessagesByConversationIdInput<T extends ConversationId, U extends UserId> {
  conversationId: T;
  requestingUserId?: U;
  newOnly?: U extends UserId ? boolean : never;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMessagesByConversationIdOutput<T extends ConversationId> {
  messages: Message<T>[];
  lastEvaluatedKey?: string;
}
