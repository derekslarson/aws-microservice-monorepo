import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Team, User } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { NotificationMappingServiceInterface } from "../entity-services/notificationMapping.service";
import { NotificationType } from "../enums/notificationType.enum";
import { WebSocketServiceInterface } from "../services/webSocket.service";
import { WebSocketEvent } from "../enums/webSocket.event.enum";
import { BaseIntegrationMediatorService, BaseIntegrationMediatorServiceInterface } from "./base.integration.mediator.service";

@injectable()
export class WebSocketMediatorService extends BaseIntegrationMediatorService implements WebSocketMediatorServiceInterface {
  constructor(
    @inject(TYPES.WebSocketServiceInterface) private webSocketService: WebSocketServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.NotificationMappingServiceInterface) notificationMappingService: NotificationMappingServiceInterface,
  ) {
    super(NotificationType.WebSocket, loggerService, notificationMappingService);
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

interface SendUserAddedToTeamMessageInput extends BaseMessageInput {
  event: WebSocketEvent.UserAddedToTeam;
  data: {
    team: Team;
    user: User;
  }
}

export type SendMessageInput = SendUserAddedToTeamMessageInput; // | add more MessageInput interfaces here;

export type SendMessageOutput = void;
