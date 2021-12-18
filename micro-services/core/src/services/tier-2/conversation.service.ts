/* eslint-disable no-nested-ternary */
/* eslint-disable @typescript-eslint/naming-convention */
import { inject, injectable } from "inversify";
import { ConversationId, GroupId, LoggerServiceInterface, MeetingId, NotFoundError, OneOnOneId, UserId } from "@yac/util";
import { TYPES } from "../../inversion-of-control/types";
import { Meeting as MeetingEntity, MeetingByUserId as MeetingByUserIdEntity, MeetingServiceInterface } from "../tier-1/meeting.service";
import { Group as GroupEntity, GroupByUserId as GroupByUserIdEntity, GroupServiceInterface } from "../tier-1/group.service";
import { OneOnOne as OneOnOneEntity, OneOnOneByUserId as OneOnOneByUserIdEntity, OneOnOneServiceInterface } from "../tier-1/oneOnOne.service";
import { Message as MessageEntity, MessageServiceInterface } from "../tier-1/message.service";
import { MembershipServiceInterface } from "../../entity-services/membership.service";

@injectable()
export class ConversationOrchestratorService implements ConversationOrchestratorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MeetingServiceInterface) private meetingService: MeetingServiceInterface,
    @inject(TYPES.GroupServiceInterface) private groupService: GroupServiceInterface,
    @inject(TYPES.OneOnOneServiceInterface) private oneOnOneService: OneOnOneServiceInterface,
    // @inject(TYPES.OneOnOneAndGroupServiceInterface) private oneOnOneAndGroupService: OneOnOneAndGroupServiceInterface,
    @inject(TYPES.MessageServiceInterface) private messageService: MessageServiceInterface,
    @inject(TYPES.MembershipServiceInterface) private membershipService: MembershipServiceInterface,
  ) {}

  public async getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput> {
    try {
      this.loggerService.trace("addUsersToOrganization called", { params }, this.constructor.name);

      const { userId, sortByDueAt, limit, exclusiveStartKey } = params;

      const { meetings: meetingEntities, lastEvaluatedKey } = await this.meetingService.getMeetingsByUserId({ userId, sortByDueAt, limit, exclusiveStartKey });

      const meetings = await Promise.all(meetingEntities.map(async (meetingEntity) => {
        const { messages: [ recentMessage ] } = await this.messageService.getMessagesByConversationId({ requestingUserId: userId, conversationId: meetingEntity.id });

        return { ...meetingEntity, recentMessage };
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

      const { groups: groupEntities, lastEvaluatedKey } = await this.groupService.getGroupsByUserId({ userId, limit, exclusiveStartKey });

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

  public async getOneOnOnesByUserId(params: GetOneOnOnesByUserIdInput): Promise<GetOneOnOnesByUserIdOutput> {
    try {
      this.loggerService.trace("getOneOnOnessByUserId called", { params }, this.constructor.name);

      const { userId, limit, exclusiveStartKey } = params;

      const { oneOnOnes: oneOnOneEntities, lastEvaluatedKey } = await this.oneOnOneService.getOneOnOnesByUserId({ userId, limit, exclusiveStartKey });

      const oneOnOnes = await Promise.all(oneOnOneEntities.map(async (oneOnOneEntity) => {
        const { messages: [ recentMessage ] } = await this.messageService.getMessagesByConversationId({ requestingUserId: userId, conversationId: oneOnOneEntity.id });

        return { ...oneOnOneEntity, recentMessage };
      }));

      return { oneOnOnes, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  // public async getOneOnOnesAndGroupsByUserId(params: GetOneOnOnesAndGroupsByUserIdInput): Promise<GetOneOnOnesAndGroupsByUserIdOutput> {
  //   try {
  //     this.loggerService.trace("getOneOnOnesAndGroupsByUserId called", { params }, this.constructor.name);

  //     const { userId, limit, exclusiveStartKey } = params;

  //     const { oneOnOnesAndGroups: oneOnOneAndGroupEntities, lastEvaluatedKey } = await this.oneOnOneAndGroupService.getOneOnOnesAndGroupsByUserId({ userId, limit, exclusiveStartKey });

  //     const oneOnOnesAndGroups = await Promise.all(oneOnOneAndGroupEntities.map(async (oneOnOneOrGroup) => {
  //       const { entity } = await this.addRecentMessageToEntity({ requestingUserId: userId, entity: oneOnOneOrGroup });

  //       return entity;
  //     }));

  //     return { oneOnOnesAndGroups, lastEvaluatedKey };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getOneOnOnesAndGroupsByUserId", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

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
}

export interface ConversationOrchestratorServiceInterface {
  getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput>;
  getGroupsByUserId(params: GetGroupsByUserIdInput): Promise<GetGroupsByUserIdOutput>;
  getOneOnOnesByUserId(params: GetOneOnOnesByUserIdInput): Promise<GetOneOnOnesByUserIdOutput>;
  // getOneOnOnesAndGroupsByUserId(params: GetOneOnOnesAndGroupsByUserIdInput): Promise<GetOneOnOnesAndGroupsByUserIdOutput>;
  isConversationMember(params: IsConversationMemberInput): Promise<IsConversationMemberOutput>
}

export type MeetingByUserId = MeetingByUserIdEntity & {
  recentMessage?: MessageEntity;
};

export type GroupByUserId = GroupByUserIdEntity & {
  recentMessage?: MessageEntity;
};

export type OneOnOneByUserId = OneOnOneByUserIdEntity & {
  recentMessage?: MessageEntity;
};

export interface GetMeetingsByUserIdInput {
  userId: UserId;
  sortByDueAt?: boolean;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetMeetingsByUserIdOutput {
  meetings: MeetingByUserId[];
  lastEvaluatedKey?: string;
}

export interface GetGroupsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetGroupsByUserIdOutput {
  groups: GroupByUserId[];
  lastEvaluatedKey?: string;
}

export interface GetOneOnOnesByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOneOnOnesByUserIdOutput {
  oneOnOnes: OneOnOneByUserId[];
  lastEvaluatedKey?: string;
}

export interface GetOneOnOnesAndGroupsByUserIdInput {
  userId: UserId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetOneOnOnesAndGroupsByUserIdOutput {
  oneOnOnesAndGroups: (GroupByUserId | OneOnOneByUserId)[];
  lastEvaluatedKey?: string;
}

export interface IsConversationMemberInput {
  userId: UserId;
  conversationId: ConversationId;
}

export interface IsConversationMemberOutput {
  isConversationMember: boolean;
}
