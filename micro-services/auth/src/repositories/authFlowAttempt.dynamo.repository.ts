import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, NotFoundError, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";

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

      const authFlowAttemptEntity: RawAuthFlowAttempt = {
        entityType: EntityType.AuthFlowAttempt,
        pk: authFlowAttempt.clientId,
        sk: authFlowAttempt.xsrfToken,
        ...(authFlowAttempt.authorizationCode && { gsi1pk: authFlowAttempt.clientId, gsi1sk: authFlowAttempt.authorizationCode }),
        ...authFlowAttempt,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
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

      const { clientId, xsrfToken } = params;

      const authFlowAttempt = await this.get({ Key: { pk: clientId, sk: xsrfToken } }, "Auth Flow Attempt");

      return { authFlowAttempt };
    } catch (error: unknown) {
      this.loggerService.error("Error in getAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getAuthFlowAttemptByAuthorizationCode(params: GetAuthFlowAttemptByAuthorizationCodeInput): Promise<GetAuthFlowAttemptByAuthorizationCodeOutput> {
    try {
      this.loggerService.trace("getAuthFlowAttempt called", { params }, this.constructor.name);

      const { clientId, authorizationCode } = params;

      const { Items: [ authFlowAttempt ] } = await this.query({
        KeyConditionExpression: "#gsi1pk = :clientId AND #gsi1sk = :authorizationCode",
        IndexName: this.gsiOneIndexName,
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":clientId": clientId,
          ":authorizationCode": authorizationCode,
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

      const { clientId, xsrfToken, updates } = params;

      type RawUpdates = UpdateAuthFlowAttemptUpdates & { gsi1pk?: string; gsi1sk?: string; };

      const rawUpdates: RawUpdates = { ...updates };

      if (updates.authorizationCode) {
        rawUpdates.gsi1pk = clientId;
        rawUpdates.gsi1sk = updates.authorizationCode;
      }

      const authFlowAttempt = await this.partialUpdate(clientId, xsrfToken, rawUpdates);

      return { authFlowAttempt };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteAuthFlowAttempt(params: DeleteAuthFlowAttemptInput): Promise<DeleteAuthFlowAttemptOutput> {
    try {
      this.loggerService.trace("deleteAuthFlowAttempt called", { params }, this.constructor.name);

      const { clientId, xsrfToken } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: clientId, sk: xsrfToken },
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
  state?: string;
  userId?: UserId;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  confirmationCode?: string;
  confirmationCodeCreatedAt?: string;
  authorizationCode?: string;
  authorizationCodeCreatedAt?: string;
}

export interface RawAuthFlowAttempt extends AuthFlowAttempt {
  entityType: EntityType.AuthFlowAttempt;
  // clientId
  pk: string;
  // xsrfToken
  sk: string;
  // clientId
  gsi1pk?: string;
  // authorizationCode
  gsi1sk?: string;
}

export interface CreateAuthFlowAttemptInput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface CreateAuthFlowAttemptOutput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface GetAuthFlowAttemptInput {
  clientId: string;
  xsrfToken: string;
}

export interface GetAuthFlowAttemptOutput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface GetAuthFlowAttemptByAuthorizationCodeInput {
  clientId: string;
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
}
export interface UpdateAuthFlowAttemptInput {
  clientId: string;
  xsrfToken: string;
  updates: UpdateAuthFlowAttemptUpdates;
}

export interface UpdateAuthFlowAttemptOutput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface DeleteAuthFlowAttemptInput {
  clientId: string;
  xsrfToken: string;
}

export type DeleteAuthFlowAttemptOutput = void;
