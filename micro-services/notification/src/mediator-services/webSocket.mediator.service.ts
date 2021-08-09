import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Team, User } from "@yac/util";
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

      await this.notificationMappingService.createNotificationMapping({ userId, type: NotificationMappingType.WebSocket, value: connectionId });
    } catch (error: unknown) {
      this.loggerService.error("Error in persistConnectionId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConnectionIdsByUserId(params: GetConnectionIdsByUserIdInput): Promise<GetConnectionIdsByUserIdOutput> {
    try {
      this.loggerService.trace("getConnectionIdsByUserId called", { params }, this.constructor.name);

      const { userId } = params;

      const { notificationMappings } = await this.notificationMappingService.getNotificationMappingsByUserIdAndType({ userId, type: NotificationMappingType.WebSocket });

      const connectionIds = notificationMappings.map((notificationMapping) => notificationMapping.value);

      return { connectionIds };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConnectionIdsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConnectionIdsByUserIds(params: GetConnectionIdsByUserIdsInput): Promise<GetConnectionIdsByUserIdsOutput> {
    try {
      this.loggerService.trace("getConnectionIdsByUserIds called", { params }, this.constructor.name);

      const { userIds } = params;

      const arraysOfConnectionIdsByUserId = await Promise.all(userIds.map(async (userId) => {
        const { connectionIds } = await this.getConnectionIdsByUserId({ userId });

        return connectionIds;
      }));

      const connectionIds = arraysOfConnectionIdsByUserId.reduce((acc, arrayOfConnectionIdsByUserId) => {
        acc.push(...arrayOfConnectionIdsByUserId);

        return acc;
      }, []);

      return { connectionIds };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConnectionIdsByUserIds", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteConnectionId(params: DeleteConnectionIdInput): Promise<DeleteConnectionIdOutput> {
    try {
      this.loggerService.trace("deleteConnectionId called", { params }, this.constructor.name);

      const { connectionId } = params;

      const { notificationMappings } = await this.notificationMappingService.getNotificationMappingsByTypeAndValue({ type: NotificationMappingType.WebSocket, value: connectionId });

      await Promise.all(notificationMappings.map((notificationMapping) => this.notificationMappingService.deleteNotificationMapping({ userId: notificationMapping.userId, type: NotificationMappingType.WebSocket, value: connectionId })));
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteConnectionId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async sendUserAddedToTeamMessage(params: SendUserAddedToTeamMessageInput): Promise<SendUserAddedToTeamMessageOutput> {
    try {
      this.loggerService.trace("sendUserAddedToTeamMessage called", { params }, this.constructor.name);

      const { connectionId, team, user } = params;

      await this.webSocketService.sendMessage({ connectionId, event: WebsocketEvent.UserAddedToTeam, data: { team, user } });
    } catch (error: unknown) {
      this.loggerService.error("Error in sendUserAddedToTeamMessage", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface WebSocketMediatorServiceInterface {
  persistConnectionId(params: PersistConnectionId): Promise<PersistConnectionIdOutput>;
  getConnectionIdsByUserId(params: GetConnectionIdsByUserIdInput): Promise<GetConnectionIdsByUserIdOutput>;
  getConnectionIdsByUserIds(params: GetConnectionIdsByUserIdsInput): Promise<GetConnectionIdsByUserIdsOutput>;
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

export interface GetConnectionIdsByUserIdsInput {
  userIds: string[];
}

export interface GetConnectionIdsByUserIdsOutput {
  connectionIds: string[];
}

export interface DeleteConnectionIdInput {
  connectionId: string;
}

export type DeleteConnectionIdOutput = void;

export interface SendUserAddedToTeamMessageInput {
  connectionId: string;
  team: Team;
  user: User;
}

export type SendUserAddedToTeamMessageOutput = void;
