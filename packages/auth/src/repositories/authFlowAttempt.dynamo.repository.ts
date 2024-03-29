import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2 } from "@yac/util/src/repositories/base.dynamo.repository.v2";
import { DocumentClientFactory } from "@yac/util/src/factories/documentClient.factory";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { NotFoundError } from "@yac/util/src/errors/notFound.error";
import { UserId } from "@yac/util/src/types/userId.type";
import { ExternalProvider } from "../enums/externalProvider.enum";
import { EntityType } from "../enums/entityType.enum";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class AuthFlowAttemptDynamoRepository extends BaseDynamoRepositoryV2<AuthFlowAttempt> implements AuthFlowAttemptRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: AuthFlowAttemptRepositoryConfig,
  ) {
    super(documentClientFactory, config.tableNames.auth, loggerService);
    this.gsiOneIndexName = config.globalSecondaryIndexNames.one;
  }

  public async createAuthFlowAttempt(params: CreateAuthFlowAttemptInput): Promise<CreateAuthFlowAttemptOutput> {
    try {
      this.loggerService.trace("createAuthFlowAttempt called", { params }, this.constructor.name);

      const { authFlowAttempt } = params;

      // auto delete item after two minutes
      const ttl = (Date.now().valueOf() / 1000) + (60 * 2);

      const authFlowAttemptEntity: RawAuthFlowAttempt = {
        entityType: EntityType.AuthFlowAttempt,
        pk: authFlowAttempt.xsrfToken,
        sk: EntityType.AuthFlowAttempt,
        ttl,
        ...authFlowAttempt,
      };

      if (authFlowAttempt.authorizationCode) {
        authFlowAttemptEntity.gsi1pk = authFlowAttempt.authorizationCode;
        authFlowAttemptEntity.gsi1sk = EntityType.AuthFlowAttempt;
      }

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: authFlowAttemptEntity,
      }).promise();

      return { authFlowAttempt };
    } catch (error: unknown) {
      this.loggerService.error("Error in createAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getAuthFlowAttempt(params: GetAuthFlowAttemptInput): Promise<GetAuthFlowAttemptOutput> {
    try {
      this.loggerService.trace("getAuthFlowAttempt called", { params }, this.constructor.name);

      const { xsrfToken } = params;

      const authFlowAttempt = await this.get({ Key: { pk: xsrfToken, sk: EntityType.AuthFlowAttempt } }, "Auth Flow Attempt");

      return { authFlowAttempt };
    } catch (error: unknown) {
      this.loggerService.error("Error in getAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getAuthFlowAttemptByAuthorizationCode(params: GetAuthFlowAttemptByAuthorizationCodeInput): Promise<GetAuthFlowAttemptByAuthorizationCodeOutput> {
    try {
      this.loggerService.trace("getAuthFlowAttempt called", { params }, this.constructor.name);

      const { authorizationCode } = params;

      const { Items: [ authFlowAttempt ] } = await this.query({
        KeyConditionExpression: "#gsi1pk = :authorizationCode AND #gsi1sk = :authFlowAttempt",
        IndexName: this.gsiOneIndexName,
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":authorizationCode": authorizationCode,
          ":authFlowAttempt": EntityType.AuthFlowAttempt,
        },
      });

      if (!authFlowAttempt) {
        throw new NotFoundError("Auth Flow Attempt not found.");
      }

      return { authFlowAttempt };
    } catch (error: unknown) {
      this.loggerService.error("Error in getAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateAuthFlowAttempt(params: UpdateAuthFlowAttemptInput): Promise<UpdateAuthFlowAttemptOutput> {
    try {
      this.loggerService.trace("updateAuthFlowAttempt called", { params }, this.constructor.name);

      const { xsrfToken, updates } = params;

      type RawUpdates = UpdateAuthFlowAttemptUpdates & { gsi1pk?: string; gsi1sk?: string; };

      const rawUpdates: RawUpdates = { ...updates };

      if (updates.authorizationCode) {
        rawUpdates.gsi1pk = updates.authorizationCode;
        rawUpdates.gsi1sk = EntityType.AuthFlowAttempt;
      }

      const authFlowAttempt = await this.partialUpdate(xsrfToken, EntityType.AuthFlowAttempt, rawUpdates, true);

      return { authFlowAttempt };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteAuthFlowAttempt(params: DeleteAuthFlowAttemptInput): Promise<DeleteAuthFlowAttemptOutput> {
    try {
      this.loggerService.trace("deleteAuthFlowAttempt called", { params }, this.constructor.name);

      const { xsrfToken } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: xsrfToken, sk: EntityType.AuthFlowAttempt },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface AuthFlowAttemptRepositoryInterface {
  createAuthFlowAttempt(params: CreateAuthFlowAttemptInput): Promise<CreateAuthFlowAttemptOutput>;
  getAuthFlowAttempt(params: GetAuthFlowAttemptInput): Promise<GetAuthFlowAttemptOutput>;
  getAuthFlowAttemptByAuthorizationCode(params: GetAuthFlowAttemptByAuthorizationCodeInput): Promise<GetAuthFlowAttemptByAuthorizationCodeOutput>;
  updateAuthFlowAttempt(params: UpdateAuthFlowAttemptInput): Promise<UpdateAuthFlowAttemptOutput>;
  deleteAuthFlowAttempt(params: DeleteAuthFlowAttemptInput): Promise<DeleteAuthFlowAttemptOutput>;
}

type AuthFlowAttemptRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface AuthFlowAttempt {
  clientId: string;
  xsrfToken: string;
  responseType: string;
  secret: string;
  scope: string;
  redirectUri: string;
  state?: string;
  userId?: UserId;
  externalProvider?: ExternalProvider;
  externalProviderState?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  confirmationCode?: string;
  confirmationCodeCreatedAt?: string;
  authorizationCode?: string;
  authorizationCodeCreatedAt?: string;
}
export interface RawAuthFlowAttempt extends AuthFlowAttempt {
  entityType: EntityType.AuthFlowAttempt;
  // xsrfToken
  pk: string;
  // EntityType.AuthFlowAttempt`
  sk: EntityType.AuthFlowAttempt;
  // time-to-live attribute (deletion date in unix seconds)
  ttl: number;
  // authorizationCode
  gsi1pk?: string;
  // EntityType.AuthFlowAttempt
  gsi1sk?: EntityType.AuthFlowAttempt;
}

export interface CreateAuthFlowAttemptInput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface CreateAuthFlowAttemptOutput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface GetAuthFlowAttemptInput {
  xsrfToken: string;
}

export interface GetAuthFlowAttemptOutput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface GetAuthFlowAttemptByAuthorizationCodeInput {
  authorizationCode: string;
}

export interface GetAuthFlowAttemptByAuthorizationCodeOutput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface UpdateAuthFlowAttemptUpdates {
  userId?: UserId;
  confirmationCode?: string;
  confirmationCodeCreatedAt?: string;
  authorizationCode?: string;
  authorizationCodeCreatedAt?: string;
  externalProvider?: ExternalProvider;
  externalProviderState?: string;
}
export interface UpdateAuthFlowAttemptInput {
  xsrfToken: string;
  updates: UpdateAuthFlowAttemptUpdates;
}

export interface UpdateAuthFlowAttemptOutput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface DeleteAuthFlowAttemptInput {
  xsrfToken: string;
}

export type DeleteAuthFlowAttemptOutput = void;
