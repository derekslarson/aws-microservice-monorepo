import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class AuthFlowAttemptDynamoRepository extends BaseDynamoRepositoryV2<AuthFlowAttempt> implements AuthFlowAttemptRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: AuthFlowAttemptRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.auth, loggerService);
  }

  public async createAuthFlowAttempt(params: CreateAuthFlowAttemptInput): Promise<CreateAuthFlowAttemptOutput> {
    try {
      this.loggerService.trace("createAuthFlowAttempt called", { params }, this.constructor.name);

      const { authFlowAttempt } = params;

      const authFlowAttemptEntity: RawAuthFlowAttempt = {
        entityType: EntityType.AuthFlowAttempt,
        pk: authFlowAttempt.clientId,
        sk: authFlowAttempt.state,
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

      const { state } = params;

      const authFlowAttempt = await this.get<AuthFlowAttempt>({ Key: { pk: state, sk: state } }, "Auth Flow Attempt");

      return { authFlowAttempt };
    } catch (error: unknown) {
      this.loggerService.error("Error in getAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateAuthFlowAttempt(params: UpdateAuthFlowAttemptInput): Promise<UpdateAuthFlowAttemptOutput> {
    try {
      this.loggerService.trace("updateAuthFlowAttempt called", { params }, this.constructor.name);

      const { clientId, state, updates } = params;

      const authFlowAttempt = await this.partialUpdate(clientId, state, updates);

      return { authFlowAttempt };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateAuthFlowAttempt", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteAuthFlowAttempt(params: DeleteAuthFlowAttemptInput): Promise<DeleteAuthFlowAttemptOutput> {
    try {
      this.loggerService.trace("deleteAuthFlowAttempt called", { params }, this.constructor.name);

      const { state } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: state, sk: state },
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
  updateAuthFlowAttempt(params: UpdateAuthFlowAttemptInput): Promise<UpdateAuthFlowAttemptOutput>;
  deleteAuthFlowAttempt(params: DeleteAuthFlowAttemptInput): Promise<DeleteAuthFlowAttemptOutput>;
}

type AuthFlowAttemptRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export interface AuthFlowAttempt {
  clientId: string;
  state: string;
  responseType: string;
  secret: string;
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
  // state
  sk: string;
}

export interface CreateAuthFlowAttemptInput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface CreateAuthFlowAttemptOutput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface GetAuthFlowAttemptInput {
  clientId: string;
  state: string;
}

export interface GetAuthFlowAttemptOutput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface UpdateAuthFlowAttemptInput {
  clientId: string;
  state: string;
  updates: {
    userId?: UserId;
    confirmationCode?: string;
    confirmationCodeCreatedAt?: string;
    authorizationCode?: string;
    authorizationCodeCreatedAt?: string;
  }
}

export interface UpdateAuthFlowAttemptOutput {
  authFlowAttempt: AuthFlowAttempt;
}

export interface DeleteAuthFlowAttemptInput {
  state: string;
}

export type DeleteAuthFlowAttemptOutput = void;
