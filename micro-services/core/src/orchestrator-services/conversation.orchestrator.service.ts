import { inject, injectable } from "inversify";
import { LoggerServiceInterface, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MeetingByUserId as MeetingEntity, MeetingMediatorServiceInterface } from "../mediator-services/meeting.mediator.service";
import { UserServiceInterface } from "../entity-services/user.service";
import { Message, MessageMediatorServiceInterface } from "../mediator-services/message.mediator.service";
import { GroupByUserId as GroupEntity, GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { OneOnOneByUserId as OneOnOneEntity, OneOnOneMediatorServiceInterface } from "../mediator-services/oneOnOne.mediator.service";

@injectable()
export class ConversationOrchestratorService implements ConversationOrchestratorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.MeetingMediatorServiceInterface) private meetingMediatorService: MeetingMediatorServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private groupMediatorService: GroupMediatorServiceInterface,
    @inject(TYPES.OneOnOneMediatorServiceInterface) private oneOnOneMediatorService: OneOnOneMediatorServiceInterface,
    @inject(TYPES.MessageMediatorServiceInterface) private messageMediatorService: MessageMediatorServiceInterface,
  ) {}

  public async getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput> {
    try {
      this.loggerService.trace("addUsersToOrganization called", { params }, this.constructor.name);

      const { userId, limit, exclusiveStartKey } = params;

      const { meetings: meetingEntities, lastEvaluatedKey } = await this.meetingMediatorService.getMeetingsByUserId({ userId, limit, exclusiveStartKey });

      const meetings = await Promise.all(meetingEntities.map(async (meeting) => {
        if (meeting.unseenMessages) {
          const { messages: [ recentMessage ] } = await this.messageMediatorService.getMessagesByMeetingId({ requestingUserId: userId, meetingId: meeting.id, limit: 1 });

          return { ...meeting, recentMessage };
        }

        return meeting;
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

      const groups = await Promise.all(groupEntities.map(async (group) => {
        if (group.unseenMessages) {
          const { messages: [ recentMessage ] } = await this.messageMediatorService.getMessagesByGroupId({ requestingUserId: userId, groupId: group.id, limit: 1 });

          return { ...group, recentMessage };
        }

        return group;
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

      const oneOnOnes = await Promise.all(oneOnOneEntities.map(async (oneOnOne) => {
        if (oneOnOne.unseenMessages) {
          const { messages: [ recentMessage ] } = await this.messageMediatorService.getMessagesByOneOnOneId({ requestingUserId: userId, oneOnOneId: oneOnOne.id, limit: 1 });

          return { ...oneOnOne, recentMessage };
        }

        return oneOnOne;
      }));

      return { oneOnOnes, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getOneOnOnesByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationOrchestratorServiceInterface {
  getMeetingsByUserId(params: GetMeetingsByUserIdInput): Promise<GetMeetingsByUserIdOutput>;
}

export type Meeting = MeetingEntity & {
  recentMessage?: Message
};

export type Group = GroupEntity & {
  recentMessage?: Message
};

export type OneOnOne = OneOnOneEntity & {
  recentMessage?: Message
};

export interface GetMeetingsByUserIdInput {
  userId: UserId;
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
