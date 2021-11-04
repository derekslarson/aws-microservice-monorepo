import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class ExternalProviderUserMappingDynamoRepository extends BaseDynamoRepositoryV2<ExternalProviderUserMapping> implements ExternalProviderUserMappingRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ExternalProviderUserMappingRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.auth, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
  }

  public async createExternalProviderUserMapping(params: CreateExternalProviderUserMappingInput): Promise<CreateExternalProviderUserMappingOutput> {
    try {
      this.loggerService.trace("createExternalProviderUserMapping called", { params }, this.constructor.name);

      const { externalProviderUserMapping } = params;
      const { userId, externalProviderId } = externalProviderUserMapping;

      const externalProviderUserMappingEntity: RawExternalProviderUserMapping = {
        entityType: EntityType.ExternalProviderUserMapping,
        pk: userId,
        sk: externalProviderId,
        gsi1pk: externalProviderId,
        gsi1sk: userId,
        ...externalProviderUserMapping,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: externalProviderUserMappingEntity,
      }).promise();

      return { externalProviderUserMapping };
    } catch (error: unknown) {
      this.loggerService.error("Error in createExternalProviderUserMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getExternalProviderUserMappingsByUserId(params: GetExternalProviderUserMappingsByUserIdInput): Promise<GetExternalProviderUserMappingsByUserIdOutput> {
    try {
      this.loggerService.trace("getExternalProviderUserMappingsByUserId called", { params }, this.constructor.name);

      const { userId } = params;

      const { Items: externalProviderUserMappings } = await this.query<ExternalProviderUserMapping>({
        KeyConditionExpression: "#pk = :userId",
        ExpressionAttributeNames: { "#pk": "pk" },
        ExpressionAttributeValues: { ":userId": userId },
      });

      return { externalProviderUserMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getExternalProviderUserMappingsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getExternalProviderUserMappingsByExternalProviderId(params: GetExternalProviderUserMappingsByExternalProviderIdInput): Promise<GetExternalProviderUserMappingsByExternalProviderIdOutput> {
    try {
      this.loggerService.trace("getExternalProviderUserMappingsByExternalProviderId called", { params }, this.constructor.name);

      const { externalProviderId } = params;

      const { Items: externalProviderUserMappings } = await this.query<ExternalProviderUserMapping>({
        KeyConditionExpression: "#gsi1pk = :gsi1pk",
        IndexName: this.gsiOneIndexName,
        ExpressionAttributeNames: { "#gsi1pk": "gsi1pk" },
        ExpressionAttributeValues: { ":gsi1pk": externalProviderId },
      });

      return { externalProviderUserMappings };
    } catch (error: unknown) {
      this.loggerService.error("Error in getExternalProviderUserMappingsByExternalProviderId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteExternalProviderUserMapping(params: DeleteExternalProviderUserMappingInput): Promise<DeleteExternalProviderUserMappingOutput> {
    try {
      this.loggerService.trace("deleteExternalProviderUserMapping called", { params }, this.constructor.name);

      const { userId, externalProviderId } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: userId, sk: externalProviderId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteExternalProviderUserMapping", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ExternalProviderUserMappingRepositoryInterface {
  createExternalProviderUserMapping(params: CreateExternalProviderUserMappingInput): Promise<CreateExternalProviderUserMappingOutput>;
  getExternalProviderUserMappingsByUserId(params: GetExternalProviderUserMappingsByUserIdInput): Promise<GetExternalProviderUserMappingsByUserIdOutput>;
  getExternalProviderUserMappingsByExternalProviderId(params: GetExternalProviderUserMappingsByExternalProviderIdInput): Promise<GetExternalProviderUserMappingsByExternalProviderIdOutput>
  deleteExternalProviderUserMapping(params: DeleteExternalProviderUserMappingInput): Promise<DeleteExternalProviderUserMappingOutput>;
}

type ExternalProviderUserMappingRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface ExternalProviderUserMapping {
  userId: UserId;
  externalProviderId: string;
}

export interface RawExternalProviderUserMapping extends ExternalProviderUserMapping {
  entityType: EntityType.ExternalProviderUserMapping;
  // userId
  pk: string;
  // externalProviderId
  sk: string;
  // externalProviderId
  gsi1pk: string;
  // userId
  gsi1sk: string;
}

export interface CreateExternalProviderUserMappingInput {
  externalProviderUserMapping: ExternalProviderUserMapping;
}

export interface CreateExternalProviderUserMappingOutput {
  externalProviderUserMapping: ExternalProviderUserMapping;
}

export interface GetExternalProviderUserMappingsByUserIdInput {
  userId: UserId;
}

export interface GetExternalProviderUserMappingsByUserIdOutput {
  externalProviderUserMappings: ExternalProviderUserMapping[];
}

export interface GetExternalProviderUserMappingsByExternalProviderIdInput {
  externalProviderId: string;
}

export interface GetExternalProviderUserMappingsByExternalProviderIdOutput {
  externalProviderUserMappings: ExternalProviderUserMapping[];
}

export interface DeleteExternalProviderUserMappingInput {
  userId: string;
  externalProviderId: string;
}

export type DeleteExternalProviderUserMappingOutput = void;
