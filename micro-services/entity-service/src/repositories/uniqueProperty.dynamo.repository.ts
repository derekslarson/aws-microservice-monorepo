import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { UniqueProperty as UniquePropertyEnum } from "../enums/uniqueProperty.enum";
import { UserId } from "../types/userId.type";

@injectable()
export class UniquePropertyDynamoRepository extends BaseDynamoRepositoryV2<UniqueProperty> implements UniquePropertyRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UniquePropertyRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
  }

  public async createUniqueProperty(params: CreateUniquePropertyInput): Promise<CreateUniquePropertyOutput> {
    try {
      this.loggerService.trace("createUniqueProperty called", { params }, this.constructor.name);

      const { uniqueProperty } = params;

      const uniquePropertyEntity: RawUniqueProperty = {
        entityType: EntityType.UniqueProperty,
        pk: uniqueProperty.property,
        sk: uniqueProperty.value,
        ...uniqueProperty,
      };

      await this.documentClient.put({
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        TableName: this.tableName,
        Item: uniquePropertyEntity,
      }).promise();

      return { uniqueProperty };
    } catch (error: unknown) {
      this.loggerService.error("Error in createUniqueProperty", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUniqueProperty(params: GetUniquePropertyInput): Promise<GetUniquePropertyOutput> {
    try {
      this.loggerService.trace("getUniqueProperty called", { params }, this.constructor.name);

      const { property, value } = params;

      const uniqueProperty = await this.get({ Key: { pk: property, sk: value } }, "Unique Property");

      return { uniqueProperty };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUniqueProperty", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteUniqueProperty(params: DeleteUniquePropertyInput): Promise<DeleteUniquePropertyOutput> {
    try {
      this.loggerService.trace("deleteUniqueProperty called", { params }, this.constructor.name);

      const { property, value } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: property, sk: value },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteUniqueProperty", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface UniquePropertyRepositoryInterface {
  createUniqueProperty(params: CreateUniquePropertyInput): Promise<CreateUniquePropertyOutput>;
  getUniqueProperty(params: GetUniquePropertyInput): Promise<GetUniquePropertyOutput>;
  deleteUniqueProperty(params: DeleteUniquePropertyInput): Promise<DeleteUniquePropertyOutput>;
}

type UniquePropertyRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export interface UniqueProperty {
  property: UniquePropertyEnum;
  value: string;
  userId: UserId;
}

export interface RawUniqueProperty extends UniqueProperty {
  entityType: EntityType.UniqueProperty;
  pk: UniquePropertyEnum;
  sk: string;
}

export interface CreateUniquePropertyInput {
  uniqueProperty: UniqueProperty;
}

export interface CreateUniquePropertyOutput {
  uniqueProperty: UniqueProperty;
}

export interface GetUniquePropertyInput {
  property: UniquePropertyEnum;
  value: string;
}

export interface GetUniquePropertyOutput {
  uniqueProperty: UniqueProperty;
}

export interface DeleteUniquePropertyInput {
  property: UniquePropertyEnum;
  value: string;
}

export type DeleteUniquePropertyOutput = void;
