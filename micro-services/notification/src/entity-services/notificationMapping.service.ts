import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { NotificationMappingRepositoryInterface, NotificationMapping as NotificationMappingEntity } from "../repositories/notificationMapping.dynamo.repository";
import { NotificationType } from "../enums/notificationType.enum";

@injectable()
export class NotificationMappingService implements NotificationMappingServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.NotificationMappingRepositoryInterface) private notificationMappingRepository: NotificationMappingRepositoryInterface,
  ) {}

  public async createNotificationMapping(params: CreateNotificationMappingInput): Promise<CreateNotificationMappingOutput> {
    try {
      this.loggerService.trace("createNotificationMapping called", { params }, this.constructor.name);

      const { userId, type, value } = params;

      const notificationMapping: NotificationMappingEntity = {
        userId,
        type,
        value,
      };

      await this.notificationMappingRepository.createNotificationMapping({ notificationMapping });

      return { notificationMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in createNotificationMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getNotificationMappingsByUserIdAndType(params: GetNotificationMappingsByUserIdAndTypeInput): Promise<GetNotificationMappingsByUserIdAndTypeOutput> {
    try {
      this.loggerService.trace("getNotificationMappingsByUserIdAndType called", { params }, this.constructor.name);

      const { userId, type } = params;

      const { notificationMappings } = await this.notificationMappingRepository.getNotificationMappingsByUserIdAndType({ userId, type });

      return { notificationMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getNotificationMappingsByUserIdAndType", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getNotificationMappingsByTypeAndValue(params: GetNotificationMappingsByTypeAndValueInput): Promise<GetNotificationMappingsByTypeAndValueOutput> {
    try {
      this.loggerService.trace("getNotificationMappingsByTypeAndValue called", { params }, this.constructor.name);

      const { type, value } = params;

      const { notificationMappings } = await this.notificationMappingRepository.getNotificationMappingsByTypeAndValue({ type, value });

      return { notificationMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getNotificationMappingsByTypeAndValue", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteNotificationMapping(params: DeleteNotificationMappingInput): Promise<DeleteNotificationMappingOutput> {
    try {
      this.loggerService.trace("deleteNotificationMapping called", { params }, this.constructor.name);

      const { userId, type, value } = params;

      const notificationMapping: NotificationMappingEntity = {
        userId,
        type,
        value,
      };

      await this.notificationMappingRepository.deleteNotificationMapping({ notificationMapping });
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteNotificationMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface NotificationMappingServiceInterface {
  createNotificationMapping(params: CreateNotificationMappingInput): Promise<CreateNotificationMappingOutput>;
  getNotificationMappingsByUserIdAndType(params: GetNotificationMappingsByUserIdAndTypeInput): Promise<GetNotificationMappingsByUserIdAndTypeOutput>;
  getNotificationMappingsByTypeAndValue(params: GetNotificationMappingsByTypeAndValueInput): Promise<GetNotificationMappingsByTypeAndValueOutput>
  deleteNotificationMapping(params: DeleteNotificationMappingInput): Promise<DeleteNotificationMappingOutput>;
}

export type NotificationMapping = NotificationMappingEntity;

export interface CreateNotificationMappingInput {
  userId: string;
  type: NotificationType;
  value: string;
}

export interface CreateNotificationMappingOutput {
  notificationMapping: NotificationMapping;
}

export interface GetNotificationMappingsByUserIdAndTypeInput {
  userId: string;
  type: NotificationType;
}

export interface GetNotificationMappingsByUserIdAndTypeOutput {
  notificationMappings: NotificationMapping[];
}

export interface GetNotificationMappingsByTypeAndValueInput {
  type: NotificationType;
  value: string;
}

export interface GetNotificationMappingsByTypeAndValueOutput {
  notificationMappings: NotificationMapping[];
}

export interface DeleteNotificationMappingInput {
  userId: string;
  type: NotificationType;
  value: string;
}

export type DeleteNotificationMappingOutput = void;
