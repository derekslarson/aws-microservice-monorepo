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

export interface UserAddedToTeamMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserAddedToTeam;
  data: {
    team: Team;
    user: User;
  }
}

export interface UserRemovedFromTeamMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserRemovedFromTeam;
  data: {
    team: Team;
    user: User;
  }
}

export interface UserAddedToGroupMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserAddedToGroup;
  data: {
    group: Group;
    user: User;
  }
}

export interface UserRemovedFromGroupMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserRemovedFromGroup;
  data: {
    group: Group;
    user: User;
  }
}

export interface UserAddedToMeetingMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserAddedToMeeting;
  data: {
    meeting: Meeting;
    user: User;
  }
}

export interface UserRemovedFromMeetingMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserRemovedFromMeeting;
  data: {
    meeting: Meeting;
    user: User;
  }
}

export interface UserAddedAsFriendMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserAddedAsFriend;
  data: {
    addingUser: User;
    addedUser: User;
  }
}

export interface UserRemovedAsFriendMessageInput extends BaseMessageInput {
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
export interface MeetingCreatedMessageInput extends BaseMessageInput {
  event: WebSocketEvent.MeetingCreated;
  data: {
    meeting: Meeting;
  }
}
export interface MessageCreatedMessageInput extends BaseMessageInput {
  event: WebSocketEvent.MessageCreated;
  data: { message: Message; }
}

export interface MessageUpdatedMessageInput extends BaseMessageInput {
  event: WebSocketEvent.MessageUpdated;
  data: { message: Message; }
}

export type SendMessageInput =
  UserAddedToTeamMessageInput |
  UserRemovedFromTeamMessageInput |
  UserAddedToGroupMessageInput |
  UserRemovedFromGroupMessageInput |
  UserAddedToMeetingMessageInput |
  UserRemovedFromMeetingMessageInput |
  UserAddedAsFriendMessageInput |
  UserRemovedAsFriendMessageInput |
  GroupCreatedMessageInput |
  TeamCreatedMessageInput |
  MeetingCreatedMessageInput |
  MessageCreatedMessageInput |
  MessageUpdatedMessageInput;

export type SendMessageOutput = void;
