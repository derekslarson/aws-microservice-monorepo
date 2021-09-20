import { inject, injectable } from "inversify";
import { Group, LoggerServiceInterface, Meeting, Message, Team, User } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { ListenerMappingServiceInterface } from "../entity-services/listenerMapping.service";
import { ListenerType } from "../enums/listenerType.enum";
import { WebSocketServiceInterface } from "../services/webSocket.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";
import { BaseIntegrationMediatorService, BaseIntegrationMediatorServiceInterface } from "./base.integration.mediator.service";

@injectable()
export class WebSocketMediatorService extends BaseIntegrationMediatorService implements WebSocketMediatorServiceInterface {
  constructor(
    @inject(TYPES.WebSocketServiceInterface) private webSocketService: WebSocketServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.ListenerMappingServiceInterface) listenerMappingService: ListenerMappingServiceInterface,
  ) {
    super(ListenerType.WebSocket, loggerService, listenerMappingService);
  }

  public async sendMessage(params: SendMessageInput): Promise<SendMessageOutput> {
    try {
      this.loggerService.trace("sendMessage called", { params }, this.constructor.name);

      const { userId, event, data } = params;

      const { listeners } = await this.getListenersByUserId({ userId });

      await Promise.allSettled(listeners.map((listener) => this.webSocketService.sendMessage({ connectionId: listener.value, event, data })));
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface WebSocketMediatorServiceInterface extends BaseIntegrationMediatorServiceInterface {
  sendMessage(params: SendMessageInput): Promise<SendMessageOutput>;
}

export interface BaseMessageInput {
  userId: string;
  event: WebSocketEvent;
  data: Record<string, unknown>;
}

export interface SendUserAddedToTeamMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserAddedToTeam;
  data: {
    team: Team;
    user: User;
  }
}

export interface SendUserRemovedFromTeamMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserRemovedFromTeam;
  data: {
    team: Team;
    user: User;
  }
}

export interface SendUserAddedToGroupMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserAddedToGroup;
  data: {
    group: Group;
    user: User;
  }
}

export interface SendUserRemovedFromGroupMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserRemovedFromGroup;
  data: {
    group: Group;
    user: User;
  }
}

export interface SendUserAddedToMeetingMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserAddedToMeeting;
  data: {
    meeting: Meeting;
    user: User;
  }
}

export interface SendUserRemovedFromMeetingMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserRemovedFromMeeting;
  data: {
    meeting: Meeting;
    user: User;
  }
}

export interface SendUserAddedAsFriendMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserAddedAsFriend;
  data: {
    addingUser: User;
    addedUser: User;
  }
}

export interface SendUserRemovedAsFriendMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserRemovedAsFriend;
  data: {
    userA: User;
    userB: User;
  }
}

export interface TeamCreatedMessageInput extends BaseMessageInput {
  event: WebSocketEvent.TeamCreated;
  data: {
    team: Team;
  }
}
export interface GroupCreatedMessageInput extends BaseMessageInput {
  event: WebSocketEvent.GroupCreated;
  data: {
    group: Group
  }
}
export interface FriendMessageCreatedMessageInput extends BaseMessageInput {
  event: WebSocketEvent.FriendMessageCreated;
  data: { message: Message; }
}

export interface FriendMessageUpdatedMessageInput extends BaseMessageInput {
  event: WebSocketEvent.FriendMessageUpdated;
  data: { message: Message; }
}

export interface GroupMessageCreatedMessageInput extends BaseMessageInput {
  event: WebSocketEvent.GroupMessageCreated;
  data: { message: Message; }
}
export interface MeetingCreatedMessageInput extends BaseMessageInput {
  event: WebSocketEvent.MeetingCreated;
  data: {
    meeting: Meeting;
  }
}

export interface GroupMessageUpdatedMessageInput extends BaseMessageInput {
  event: WebSocketEvent.GroupMessageUpdated;
  data: { message: Message; }
}

export interface MeetingMessageCreatedMessageInput extends BaseMessageInput {
  event: WebSocketEvent.MeetingMessageCreated;
  data: { message: Message; }
}

export interface MeetingMessageUpdatedMessageInput extends BaseMessageInput {
  event: WebSocketEvent.MeetingMessageUpdated;
  data: { message: Message; }
}

export type SendMessageInput =
  SendUserAddedToTeamMessageInput |
  SendUserRemovedFromTeamMessageInput |
  SendUserAddedToGroupMessageInput |
  SendUserRemovedFromGroupMessageInput |
  SendUserAddedToMeetingMessageInput |
  GroupCreatedMessageInput |
  SendUserRemovedFromMeetingMessageInput |
  SendUserAddedAsFriendMessageInput |
  SendUserRemovedAsFriendMessageInput |
  TeamCreatedMessageInput |
  FriendMessageCreatedMessageInput |
  FriendMessageUpdatedMessageInput |
  GroupMessageCreatedMessageInput |
  GroupMessageUpdatedMessageInput |
  MeetingMessageCreatedMessageInput |
  MeetingMessageUpdatedMessageInput |
  FriendMessageCreatedMessageInput |
  MeetingCreatedMessageInput;

export type SendMessageOutput = void;
