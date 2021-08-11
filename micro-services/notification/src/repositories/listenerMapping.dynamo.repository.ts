import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { ListenerType } from "../enums/listenerType.enum";

@injectable()
export class ListenerMappingDynamoRepository extends BaseDynamoRepositoryV2<ListenerMapping> implements ListenerMappingRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ListenerMappingRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.listenerMapping as string, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createListenerMapping(params: CreateListenerMappingInput): Promise<CreateListenerMappingOutput> {
    try {
      this.loggerService.trace("createListenerMapping called", { params }, this.constructor.name);

      const { listenerMapping } = params;

      const sk = `${listenerMapping.type}-${listenerMapping.value}`;

      const listenerMappingEntity: RawListenerMapping = {
        entityType: EntityType.ListenerMapping,
        pk: listenerMapping.userId,
        sk,
        gsi1pk: sk,
        gsi1sk: listenerMapping.userId,
        ...listenerMapping,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: listenerMappingEntity,
      }).promise();

      return { listenerMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in createListenerMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getListenerMappingsByUserIdAndType(params: GetListenerMappingsByUserIdAndTypeInput): Promise<GetListenerMappingsByUserIdAndTypeOutput> {
    try {
      this.loggerService.trace("getListenerMappingsByUserIdAndType called", { params }, this.constructor.name);

      const { userId, type } = params;

      const { Items: listenerMappings } = await this.query<ListenerMapping>({
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

      return { listenerMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getListenerMappingsByUserIdAndType", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getListenerMappingsByTypeAndValue(params: GetListenerMappingsByTypeAndValueInput): Promise<GetListenerMappingsByTypeAndValueOutput> {
    try {
      this.loggerService.trace("getListenerMappingsByTypeAndValue called", { params }, this.constructor.name);

      const { type, value } = params;

      const gsi1pk = `${type}-${value}`;

      const { Items: listenerMappings } = await this.query<ListenerMapping>({
        KeyConditionExpression: "#gsi1pk = :gsi1pk",
        IndexName: this.gsiOneIndexName,
        ExpressionAttributeNames: { "#gsi1pk": "gsi1pk" },
        ExpressionAttributeValues: { ":gsi1pk": gsi1pk },
      });

      return { listenerMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getListenerMappingsByTypeAndValue", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteListenerMapping(params: DeleteListenerMappingInput): Promise<DeleteListenerMappingOutput> {
    try {
      this.loggerService.trace("deleteListenerMapping called", { params }, this.constructor.name);

      const { listenerMapping } = params;

      const sk = `${listenerMapping.type}-${listenerMapping.value}`;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: listenerMapping.userId, sk },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteListenerMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ListenerMappingRepositoryInterface {
  createListenerMapping(params: CreateListenerMappingInput): Promise<CreateListenerMappingOutput>;
  getListenerMappingsByUserIdAndType(params: GetListenerMappingsByUserIdAndTypeInput): Promise<GetListenerMappingsByUserIdAndTypeOutput>;
  getListenerMappingsByTypeAndValue(params: GetListenerMappingsByTypeAndValueInput): Promise<GetListenerMappingsByTypeAndValueOutput>
  deleteListenerMapping(params: DeleteListenerMappingInput): Promise<DeleteListenerMappingOutput>;
}

type ListenerMappingRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface ListenerMapping {
  type: ListenerType;
  value: string;
  userId: string;
}

export interface RawListenerMapping extends ListenerMapping {
  entityType: EntityType.ListenerMapping;
  // userId
  pk: string;
  // `${type}-${value}`
  sk: string;
  // `${type}-${value}`
  gsi1pk: string;
  // userId
  gsi1sk: string;
}

export interface CreateListenerMappingInput {
  listenerMapping: ListenerMapping;
}

export interface CreateListenerMappingOutput {
  listenerMapping: ListenerMapping;
}

export interface GetListenerMappingsByUserIdAndTypeInput {
  userId: string;
  type: ListenerType;
}

export interface GetListenerMappingsByUserIdAndTypeOutput {
  listenerMappings: ListenerMapping[];
}

export interface GetListenerMappingsByTypeAndValueInput {
  type: ListenerType;
  value: string;
}

export interface GetListenerMappingsByTypeAndValueOutput {
  listenerMappings: ListenerMapping[];
}

export interface DeleteListenerMappingInput {
  listenerMapping: ListenerMapping;
}

export type DeleteListenerMappingOutput = void;
