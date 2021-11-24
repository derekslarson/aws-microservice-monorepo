import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, NotFoundError, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class ExternalProviderAuthFlowAttemptDynamoRepository extends BaseDynamoRepositoryV2<ExternalProviderAuthFlowAttempt> implements ExternalProviderAuthFlowAttemptRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: ExternalProviderAuthFlowAttemptRepositoryConfig,
  ) {
    super(documentClientFactory, config.tableNames.auth, loggerService);
    this.gsiOneIndexName = config.globalSecondaryIndexNames.one;
  }

  public async createExternalProviderAuthFlowAttempt(params: CreateExternalProviderAuthFlowAttemptInput): Promise<CreateExternalProviderAuthFlowAttemptOutput> {
    try {
      this.loggerService.trace("createExternalProviderAuthFlowAttempt called", { params }, this.constructor.name);

      const { externalProviderAuthFlowAttempt } = params;

      // auto delete item after two minutes
      const ttl = (Date.now().valueOf() / 1000) + (60 * 2);

      const externalProviderAuthFlowAttemptEntity: RawExternalProviderAuthFlowAttempt = {
        entityType: EntityType.ExternalProviderAuthFlowAttempt,
        pk: externalProviderAuthFlowAttempt.state,
        sk: EntityType.ExternalProviderAuthFlowAttempt,
        ttl,
        ...externalProviderAuthFlowAttempt,
      };

      if (externalProviderAuthFlowAttempt.authorizationCode) {
        externalProviderAuthFlowAttemptEntity.gsi1pk = externalProviderAuthFlowAttempt.authorizationCode;
        externalProviderAuthFlowAttemptEntity.gsi1sk = EntityType.ExternalProviderAuthFlowAttempt;
      }

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: externalProviderAuthFlowAttemptEntity,
      }).promise();

      return { externalProviderAuthFlowAttempt };
    } catch (error: unknown) {
      this.loggerService.error("Error in createExternalProviderAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getExternalProviderAuthFlowAttempt(params: GetExternalProviderAuthFlowAttemptInput): Promise<GetExternalProviderAuthFlowAttemptOutput> {
    try {
      this.loggerService.trace("getExternalProviderAuthFlowAttempt called", { params }, this.constructor.name);

      const { state } = params;

      const externalProviderAuthFlowAttempt = await this.get({ Key: { pk: state, sk: EntityType.ExternalProviderAuthFlowAttempt } }, "External Provider Auth Flow Attempt");

      return { externalProviderAuthFlowAttempt };
    } catch (error: unknown) {
      this.loggerService.error("Error in getExternalProviderAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getExternalProviderAuthFlowAttemptByAuthorizationCode(params: GetExternalProviderAuthFlowAttemptByAuthorizationCodeInput): Promise<GetExternalProviderAuthFlowAttemptByAuthorizationCodeOutput> {
    try {
      this.loggerService.trace("getExternalProviderAuthFlowAttempt called", { params }, this.constructor.name);

      const { authorizationCode } = params;

      const { Items: [ externalProviderAuthFlowAttempt ] } = await this.query({
        KeyConditionExpression: "#gsi1pk = :authorizationCode AND #gsi1sk = :externalProviderAuthFlowAttempt",
        IndexName: this.gsiOneIndexName,
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":authorizationCode": authorizationCode,
          ":externalProviderAuthFlowAttempt": EntityType.ExternalProviderAuthFlowAttempt,
        },
      });

      if (!externalProviderAuthFlowAttempt) {
        throw new NotFoundError("External Provider Auth Flow Attempt not found.");
      }

      return { externalProviderAuthFlowAttempt };
    } catch (error: unknown) {
      this.loggerService.error("Error in getExternalProviderAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateExternalProviderAuthFlowAttempt(params: UpdateExternalProviderAuthFlowAttemptInput): Promise<UpdateExternalProviderAuthFlowAttemptOutput> {
    try {
      this.loggerService.trace("updateExternalProviderAuthFlowAttempt called", { params }, this.constructor.name);

      const { state, updates } = params;

      type RawUpdates = UpdateExternalProviderAuthFlowAttemptUpdates & { gsi1pk?: string; gsi1sk?: string; };

      const rawUpdates: RawUpdates = { ...updates };

      if (updates.authorizationCode) {
        rawUpdates.gsi1pk = updates.authorizationCode;
        rawUpdates.gsi1sk = EntityType.ExternalProviderAuthFlowAttempt;
      }

      const externalProviderAuthFlowAttempt = await this.partialUpdate(state, EntityType.ExternalProviderAuthFlowAttempt, rawUpdates);

      return { externalProviderAuthFlowAttempt };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateExternalProviderAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteExternalProviderAuthFlowAttempt(params: DeleteExternalProviderAuthFlowAttemptInput): Promise<DeleteExternalProviderAuthFlowAttemptOutput> {
    try {
      this.loggerService.trace("deleteExternalProviderAuthFlowAttempt called", { params }, this.constructor.name);

      const { state } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: state, sk: EntityType.ExternalProviderAuthFlowAttempt },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteExternalProviderAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface ExternalProviderAuthFlowAttemptRepositoryInterface {
  createExternalProviderAuthFlowAttempt(params: CreateExternalProviderAuthFlowAttemptInput): Promise<CreateExternalProviderAuthFlowAttemptOutput>;
  getExternalProviderAuthFlowAttempt(params: GetExternalProviderAuthFlowAttemptInput): Promise<GetExternalProviderAuthFlowAttemptOutput>;
  getExternalProviderAuthFlowAttemptByAuthorizationCode(params: GetExternalProviderAuthFlowAttemptByAuthorizationCodeInput): Promise<GetExternalProviderAuthFlowAttemptByAuthorizationCodeOutput>;
  updateExternalProviderAuthFlowAttempt(params: UpdateExternalProviderAuthFlowAttemptInput): Promise<UpdateExternalProviderAuthFlowAttemptOutput>;
  deleteExternalProviderAuthFlowAttempt(params: DeleteExternalProviderAuthFlowAttemptInput): Promise<DeleteExternalProviderAuthFlowAttemptOutput>;
}

type ExternalProviderAuthFlowAttemptRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface ExternalProviderAuthFlowAttempt {
  state: string;
  clientId: string;
  responseType: string;
  scope: string;
  redirectUri: string;
  externalProvider: string;
  initialState?: string;
  userId?: UserId;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  authorizationCode?: string;
  authorizationCodeCreatedAt?: string;
}

export interface RawExternalProviderAuthFlowAttempt extends ExternalProviderAuthFlowAttempt {
  entityType: EntityType.ExternalProviderAuthFlowAttempt;
  // state
  pk: string;
  sk: EntityType.ExternalProviderAuthFlowAttempt;
  // time-to-live attribute (deletion date in unix seconds)
  ttl: number;
  // authorizationCode
  gsi1pk?: string;
  gsi1sk?: EntityType.ExternalProviderAuthFlowAttempt;
}

export interface CreateExternalProviderAuthFlowAttemptInput {
  externalProviderAuthFlowAttempt: ExternalProviderAuthFlowAttempt;
}

export interface CreateExternalProviderAuthFlowAttemptOutput {
  externalProviderAuthFlowAttempt: ExternalProviderAuthFlowAttempt;
}

export interface GetExternalProviderAuthFlowAttemptInput {
  state: string;
}

export interface GetExternalProviderAuthFlowAttemptOutput {
  externalProviderAuthFlowAttempt: ExternalProviderAuthFlowAttempt;
}

export interface GetExternalProviderAuthFlowAttemptByAuthorizationCodeInput {
  authorizationCode: string;
}

export interface GetExternalProviderAuthFlowAttemptByAuthorizationCodeOutput {
  externalProviderAuthFlowAttempt: ExternalProviderAuthFlowAttempt;
}

export interface UpdateExternalProviderAuthFlowAttemptUpdates {
  userId?: UserId;
  confirmationCode?: string;
  confirmationCodeCreatedAt?: string;
  authorizationCode?: string;
  authorizationCodeCreatedAt?: string;
}
export interface UpdateExternalProviderAuthFlowAttemptInput {
  state: string;
  updates: UpdateExternalProviderAuthFlowAttemptUpdates;
}

export interface UpdateExternalProviderAuthFlowAttemptOutput {
  externalProviderAuthFlowAttempt: ExternalProviderAuthFlowAttempt;
}

export interface DeleteExternalProviderAuthFlowAttemptInput {
  state: string;
}

export type DeleteExternalProviderAuthFlowAttemptOutput = void;
