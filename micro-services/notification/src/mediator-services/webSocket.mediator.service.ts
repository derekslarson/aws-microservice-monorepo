import { inject, injectable } from "inversify";
import { Group, LoggerServiceInterface, Meeting, Team, User } from "@yac/util";
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

      const { listeners: connectionIds } = await this.getListenersByUserId({ userId });

      await Promise.all(connectionIds.map((connectionId) => this.webSocketService.sendMessage({ connectionId, event, data })));
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

export type SendMessageInput =
  SendUserAddedToTeamMessageInput |
  SendUserRemovedFromTeamMessageInput |
  SendUserAddedToGroupMessageInput |
  SendUserRemovedFromGroupMessageInput |
  SendUserAddedToMeetingMessageInput |
  SendUserRemovedFromMeetingMessageInput;

export type SendMessageOutput = void;
