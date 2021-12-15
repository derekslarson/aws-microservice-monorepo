/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/naming-convention */
import { inject, injectable } from "inversify";
import { ConversationId, GroupId, LoggerServiceInterface, MeetingId, NotFoundError, OneOnOneId, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MeetingByUserId as MeetingEntity, MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { Message, MessageMediatorServiceInterface } from "../mediator-services/message.mediator.service";
import { GroupByUserId as GroupEntity, GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { OneOnOneByUserId as OneOnOneEntity, OneOnOneMediatorServiceInterface } from "../mediator-services/oneOnOne.mediator.service";
import { OneOnOneAndGroupMediatorServiceInterface } from "../mediator-services/oneOnOneAndGroup.mediator.service";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { MembershipServiceInterface } from "../entity-services/membership.service";

@injectable()
export class ConversationOrchestratorService implements ConversationOrchestratorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private meetingMediatorService: MeetingMediatorServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private groupMediatorService: GroupMediatorServiceInterface,
    @inject(TYPES.OneOnOneMediatorServiceInterface) private oneOnOneMediatorService: OneOnOneMediatorServiceInterface,
    @inject(TYPES.OneOnOneAndGroupMediatorServiceInterface) private oneOnOneAndGroupMediatorService: OneOnOneAndGroupMediatorServiceInterface,
    @inject(TYPES.MessageMediatorServiceInterface) private messageMediatorService: MessageMediatorServiceInterface,
    @inject(TYPES.MembershipServiceInterface) private membershipService: MembershipServiceInterface,
  ) {}

  public async getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput> {
    try {
      this.loggerService.trace("addUsersToOrganization called", { params }, this.constructor.name);

      const { userId, sortByDueAt, limit, exclusiveStartKey } = params;

      const { meetings: meetingEntities, lastEvaluatedKey } = await this.meetingMediatorService.getMeetingsByUserId({ userId, sortByDueAt, limit, exclusiveStartKey });

      const meetings = await Promise.all(meetingEntities.map(async (meetingEntity) => {
        const { entity } = await this.addRecentMessageToEntity({ requestingUserId: userId, entity: meetingEntity });

        return entity;
      }));

      return { meetings, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUsersToOrganization", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGroupsByUserId(params: GetGroupsByUserIdInput): Promise<GetGroupsByUserIdOutput> {
    try {
      this.loggerService.trace("getGroupsByUserId called", { params }, this.constructor.name);

      const { userId, limit, exclusiveStartKey } = params;

      const { groups: groupEntities, lastEvaluatedKey } = await this.groupMediatorService.getGroupsByUserId({ userId, limit, exclusiveStartKey });

      const groups = await Promise.all(groupEntities.map(async (groupEntity) => {
        const { entity } = await this.addRecentMessageToEntity({ requestingUserId: userId, entity: groupEntity });

        return entity;
      }));

      return { groups, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGroupsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getOneOnOnesByUserId(params: GetOneOnOnesByUserIdInput): Promise<GetOneOnOnesByUserIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnessByUserId called", { params }, this.constructor.name);

      const { userId, limit, exclusiveStartKey } = params;

      const { oneOnOnes: oneOnOneEntities, lastEvaluatedKey } = await this.oneOnOneMediatorService.getOneOnOnesByUserId({ userId, limit, exclusiveStartKey });

      const oneOnOnes = await Promise.all(oneOnOneEntities.map(async (oneOnOneEntity) => {
        const { entity } = await this.addRecentMessageToEntity({ requestingUserId: userId, entity: oneOnOneEntity });

        return entity;
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

      const { userId, limit, exclusiveStartKey } = params;

      const { oneOnOnesAndGroups: oneOnOneAndGroupEntities, lastEvaluatedKey } = await this.oneOnOneAndGroupMediatorService.getOneOnOnesAndGroupsByUserId({ userId, limit, exclusiveStartKey });

      const oneOnOnesAndGroups = await Promise.all(oneOnOneAndGroupEntities.map(async (oneOnOneOrGroup) => {
        const { entity } = await this.addRecentMessageToEntity({ requestingUserId: userId, entity: oneOnOneOrGroup });

        return entity;
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

      await this.membershipService.getMembership({ entityId: conversationId, userId });

      return { isConversationMember: true };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isConversationMember: false };
      }
      this.loggerService.error("Error in isConversationMember", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private async addRecentMessageToEntity<T extends ConversationEntity>(params: AddRecentMessageToEntityInput<T>): Promise<AddRecentMessageToEntityOutput<T>> {
    try {
      this.loggerService.trace("convertGroupEntityToGroup called", { params }, this.constructor.name);

      const { requestingUserId, entity } = params;

      if (entity.unseenMessages) {
        const messageReqest = entity.id.startsWith(KeyPrefix.Meeting) ? this.messageMediatorService.getMessagesByMeetingId({ requestingUserId, meetingId: entity.id as MeetingId, limit: 1 })
          : entity.id.startsWith(KeyPrefix.Group) ? this.messageMediatorService.getMessagesByGroupId({ requestingUserId, groupId: entity.id as GroupId, limit: 1 })
            : this.messageMediatorService.getMessagesByOneOnOneId({ requestingUserId, oneOnOneId: entity.id as OneOnOneId, limit: 1 });

        const { messages: [ recentMessage ] } = await messageReqest;

        return { entity: { ...entity, recentMessage } };
      }

      return { entity };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertGroupEntityToGroup", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationOrchestratorServiceInterface {
  getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput>;
  getGroupsByUserId(params: GetGroupsByUserIdInput): Promise<GetGroupsByUserIdOutput>;
  getOneOnOnesByUserId(params: GetOneOnOnesByUserIdInput): Promise<GetOneOnOnesByUserIdOutput>;
  getOneOnOnesAndGroupsByUserId(params: GetOneOnOnesAndGroupsByUserIdInput): Promise<GetOneOnOnesAndGroupsByUserIdOutput>;
  isConversationMember(params: IsConversationMemberInput): Promise<IsConversationMemberOutput>
}

export type Meeting = MeetingEntity & {
  recentMessage?: Message
};

export type Group = GroupEntity & {
  recentMessage?: Message
};

export type OneOnOne = OneOnOneEntity & {
  recentMessage?: Message;
};

export interface GetMeetingsByUserIdInput {
  userId: UserId;
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByUserIdOutput {
  meetings: Meeting[];
  lastEvaluatedKey?: string;
}

export interface GetGroupsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsByUserIdOutput {
  groups: Group[];
  lastEvaluatedKey?: string;
}

export interface GetOneOnOnesByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOneOnOnesByUserIdOutput {
  oneOnOnes: OneOnOne[];
  lastEvaluatedKey?: string;
}

export interface GetOneOnOnesAndGroupsByUserIdInput {
  userId: UserId;
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

type ConversationEntity = GroupEntity | MeetingEntity | OneOnOneEntity;

interface AddRecentMessageToEntityInput<T extends ConversationEntity> {
  requestingUserId: UserId;
  entity: T;
}

interface AddRecentMessageToEntityOutput<T extends ConversationEntity> {
  entity: T & { recentMessage?: Message; };
}
