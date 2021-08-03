import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { UserId } from "../types/userId.type";
import { NotificationMappingServiceInterface } from "../entity-services/notificationMapping.service";
import { NotificationMappingType } from "../enums/notificationMapping.Type.enum";

@injectable()
export class WebSocketMediatorService implements WebSocketMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.NotificationMappingServiceInterface) private notificationMappingService: NotificationMappingServiceInterface,
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

  public async deleteConnectionId(params: DeleteCOnnectionIdInput): Promise<DeleteCOnnectionIdOutput> {
    try {
      this.loggerService.trace("addUserToWebsocket called", { params }, this.constructor.name);

      const { connectionId } = params;

      const { notificationMappings } = await this.notificationMappingService.getNotificationMappingsByTypeAndValue({ type: NotificationMappingType.Websocket, value: connectionId });

      await Promise.all(notificationMappings.map((notificationMapping) => this.notificationMappingService.deleteNotificationMapping({ userId: notificationMapping.userId, type: NotificationMappingType.Websocket, value: connectionId })));
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToWebsocket", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface WebSocketMediatorServiceInterface {
  persistConnectionId(params: PersistConnectionId): Promise<PersistConnectionIdOutput>;
  getConnectionIdsByUserId(params: GetConnectionIdsByUserIdInput): Promise<GetConnectionIdsByUserIdOutput>;
  deleteConnectionId(params: DeleteCOnnectionIdInput): Promise<DeleteCOnnectionIdOutput>;
}

export interface PersistConnectionId {
  userId: UserId;
  connectionId: string;
}

export type PersistConnectionIdOutput = void;

export interface GetConnectionIdsByUserIdInput {
  userId: UserId;
}

export interface GetConnectionIdsByUserIdOutput {
  connectionIds: string[];
}

export interface DeleteCOnnectionIdInput {
  connectionId: string;
}

export type DeleteCOnnectionIdOutput = void;
