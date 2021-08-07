import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { NotificationMappingType } from "../enums/notificationMapping.Type.enum";

@injectable()
export class NotificationMappingDynamoRepository extends BaseDynamoRepositoryV2<NotificationMapping> implements NotificationMappingRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: NotificationMappingRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.notificationMapping as string, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createNotificationMapping(params: CreateNotificationMappingInput): Promise<CreateNotificationMappingOutput> {
    try {
      this.loggerService.trace("createNotificationMapping called", { params }, this.constructor.name);

      const { notificationMapping } = params;

      const sk = `${notificationMapping.type}-${notificationMapping.value}`;

      const notificationMappingEntity: RawNotificationMapping = {
        entityType: EntityType.NotificationMapping,
        pk: notificationMapping.userId,
        sk,
        gsi1pk: sk,
        gsi1sk: notificationMapping.userId,
        ...notificationMapping,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: notificationMappingEntity,
      }).promise();

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

      const { Items: notificationMappings } = await this.query<NotificationMapping>({
        KeyConditionExpression: "#pk = :userId AND begins_with(#sk, :type)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":userId": userId,
          ":type": `${type}-`,
        },
      });

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

      const gsi1pk = `${type}-${value}`;

      const { Items: notificationMappings } = await this.query<NotificationMapping>({
        KeyConditionExpression: "#gsi1pk = :gsi1pk",
        IndexName: this.gsiOneIndexName,
        ExpressionAttributeNames: { "#gsi1pk": "gsi1pk" },
        ExpressionAttributeValues: { ":gsi1pk": gsi1pk },
      });

      return { notificationMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getNotificationMappingsByTypeAndValue", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteNotificationMapping(params: DeleteNotificationMappingInput): Promise<DeleteNotificationMappingOutput> {
    try {
      this.loggerService.trace("deleteNotificationMapping called", { params }, this.constructor.name);

      const { notificationMapping } = params;

      const sk = `${notificationMapping.type}-${notificationMapping.value}`;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: notificationMapping.userId, sk },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteNotificationMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface NotificationMappingRepositoryInterface {
  createNotificationMapping(params: CreateNotificationMappingInput): Promise<CreateNotificationMappingOutput>;
  getNotificationMappingsByUserIdAndType(params: GetNotificationMappingsByUserIdAndTypeInput): Promise<GetNotificationMappingsByUserIdAndTypeOutput>;
  getNotificationMappingsByTypeAndValue(params: GetNotificationMappingsByTypeAndValueInput): Promise<GetNotificationMappingsByTypeAndValueOutput>
  deleteNotificationMapping(params: DeleteNotificationMappingInput): Promise<DeleteNotificationMappingOutput>;
}

type NotificationMappingRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface NotificationMapping {
  type: NotificationMappingType;
  value: string;
  userId: string;
}

export interface RawNotificationMapping extends NotificationMapping {
  entityType: EntityType.NotificationMapping;
  // userId
  pk: string;
  // `${type}-${value}`
  sk: string;
  // `${type}-${value}`
  gsi1pk: string;
  // userId
  gsi1sk: string;
}

export interface CreateNotificationMappingInput {
  notificationMapping: NotificationMapping;
}

export interface CreateNotificationMappingOutput {
  notificationMapping: NotificationMapping;
}

export interface GetNotificationMappingsByUserIdAndTypeInput {
  userId: string;
  type: NotificationMappingType;
}

export interface GetNotificationMappingsByUserIdAndTypeOutput {
  notificationMappings: NotificationMapping[];
}

export interface GetNotificationMappingsByTypeAndValueInput {
  type: NotificationMappingType;
  value: string;
}

export interface GetNotificationMappingsByTypeAndValueOutput {
  notificationMappings: NotificationMapping[];
}

export interface DeleteNotificationMappingInput {
  notificationMapping: NotificationMapping;
}

export type DeleteNotificationMappingOutput = void;
