import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { NotificationMappingServiceInterface } from "../entity-services/notificationMapping.service";
import { NotificationMappingType } from "../enums/notificationMapping.Type.enum";
import { WebSocketServiceInterface } from "../services/webSocket.service";
import { WebsocketEvent } from "../enums/webSocket.event.enum";

@injectable()
export class WebSocketMediatorService implements WebSocketMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.NotificationMappingServiceInterface) private notificationMappingService: NotificationMappingServiceInterface,
    @inject(TYPES.WebSocketServiceInterface) private webSocketService: WebSocketServiceInterface,
  ) {}

  public async persistConnectionId(params: PersistConnectionId): Promise<PersistConnectionIdOutput> {
    try {
      this.loggerService.trace("persistConnectionId called", { params }, this.constructor.name);

      const { userId, connectionId } = params;

      await this.notificationMappingService.createNotificationMapping({ userId, type: NotificationMappingType.Websocket, value: connectionId });
    } catch (error: unknown) {
      this.loggerService.error("Error in persistConnectionId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConnectionIdsByUserId(params: GetConnectionIdsByUserIdInput): Promise<GetConnectionIdsByUserIdOutput> {
    try {
      this.loggerService.trace("getConnectionIdsByUserId called", { params }, this.constructor.name);

      const { userId } = params;

      const { notificationMappings } = await this.notificationMappingService.getNotificationMappingsByUserIdAndType({ userId, type: NotificationMappingType.Websocket });

      const connectionIds = notificationMappings.map((notificationMapping) => notificationMapping.value);

      return { connectionIds };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConnectionIdsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteConnectionId(params: DeleteConnectionIdInput): Promise<DeleteConnectionIdOutput> {
    try {
      this.loggerService.trace("deleteConnectionId called", { params }, this.constructor.name);

      const { connectionId } = params;

      const { notificationMappings } = await this.notificationMappingService.getNotificationMappingsByTypeAndValue({ type: NotificationMappingType.Websocket, value: connectionId });

      await Promise.all(notificationMappings.map((notificationMapping) => this.notificationMappingService.deleteNotificationMapping({ userId: notificationMapping.userId, type: NotificationMappingType.Websocket, value: connectionId })));
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteConnectionId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async sendUserAddedToTeamMessage(params: SendUserAddedToTeamMessageInput): Promise<SendUserAddedToTeamMessageOutput> {
    try {
      this.loggerService.trace("sendUserAddedToTeamMessage called", { params }, this.constructor.name);

      const { connectionId, teamId, userId } = params;

      await this.webSocketService.sendMessage({
        connectionId,
        event: WebsocketEvent.UserAddedToTeam,
        data: { teamId, userId },
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in sendUserAddedToTeamMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface WebSocketMediatorServiceInterface {
  persistConnectionId(params: PersistConnectionId): Promise<PersistConnectionIdOutput>;
  getConnectionIdsByUserId(params: GetConnectionIdsByUserIdInput): Promise<GetConnectionIdsByUserIdOutput>;
  deleteConnectionId(params: DeleteConnectionIdInput): Promise<DeleteConnectionIdOutput>;
  sendUserAddedToTeamMessage(params: SendUserAddedToTeamMessageInput): Promise<SendUserAddedToTeamMessageOutput>;
}

export interface PersistConnectionId {
  userId: string;
  connectionId: string;
}

export type PersistConnectionIdOutput = void;

export interface GetConnectionIdsByUserIdInput {
  userId: string;
}

export interface GetConnectionIdsByUserIdOutput {
  connectionIds: string[];
}

export interface DeleteConnectionIdInput {
  connectionId: string;
}

export type DeleteConnectionIdOutput = void;

export interface SendUserAddedToTeamMessageInput {
  connectionId: string;
  teamId: string;
  userId: string;
}

export type SendUserAddedToTeamMessageOutput = void;
