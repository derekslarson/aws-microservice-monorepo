import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, NotFoundError, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class GoogleCredentialsDynamoRepository extends BaseDynamoRepositoryV2<GoogleCredentials> implements GoogleCredentialsRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: GoogleCredentialsRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.calendar, loggerService);
  }

  public async createGoogleCredentials(params: CreateGoogleCredentialsInput): Promise<CreateGoogleCredentialsOutput> {
    try {
      this.loggerService.trace("createGoogleCredentials called", { params }, this.constructor.name);

      const { googleCredentials } = params;

      const googleCredentialsEntity: RawGoogleCredentials = {
        entityType: EntityType.GoogleCredentials,
        pk: googleCredentials.userId,
        sk: googleCredentials.userId,
        ...googleCredentials,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: googleCredentialsEntity,
      }).promise();

      return { googleCredentials };
    } catch (error: unknown) {
      this.loggerService.error("Error in createGoogleCredentials", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGoogleCredentials(params: GetGoogleCredentialsInput): Promise<GetGoogleCredentialsOutput> {
    try {
      this.loggerService.trace("getGoogleCredentials called", { params }, this.constructor.name);

      const { userId } = params;

      const googleCredentials = await this.get<GoogleCredentials>({ Key: { pk: userId, sk: userId } }, "Google Credentials");

      return { googleCredentials };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGoogleCredentials", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateGoogleCredentials(params: UpdateGoogleCredentialsInput): Promise<UpdateGoogleCredentialsOutput> {
    try {
      this.loggerService.trace("updateGoogleCredentials called", { params }, this.constructor.name);

      const { userId, updates } = params;

      const googleCredentials = await this.partialUpdate(userId, userId, updates);
      return { googleCredentials };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateGoogleCredentials", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteGoogleCredentials(params: DeleteGoogleCredentialsInput): Promise<DeleteGoogleCredentialsOutput> {
    try {
      this.loggerService.trace("deleteGoogleCredentials called", { params }, this.constructor.name);

      const { userId } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: userId, sk: userId },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteGoogleCredentials", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface GoogleCredentialsRepositoryInterface {
  createGoogleCredentials(params: CreateGoogleCredentialsInput): Promise<CreateGoogleCredentialsOutput>;
  getGoogleCredentials(params: GetGoogleCredentialsInput): Promise<GetGoogleCredentialsOutput>;
  updateGoogleCredentials(params: UpdateGoogleCredentialsInput): Promise<UpdateGoogleCredentialsOutput>;
  deleteGoogleCredentials(params: DeleteGoogleCredentialsInput): Promise<DeleteGoogleCredentialsOutput>;
}

type GoogleCredentialsRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export interface GoogleCredentials {
  userId: UserId;
  accessToken: string;
  refreshToken: string;
}

export interface RawGoogleCredentials extends GoogleCredentials {
  entityType: EntityType.GoogleCredentials;
  pk: UserId;
  sk: UserId;
}

export interface CreateGoogleCredentialsInput {
  googleCredentials: GoogleCredentials;
}

export interface CreateGoogleCredentialsOutput {
  googleCredentials: GoogleCredentials;
}

export type GoogleCredentialsUpdates = Partial<Pick<GoogleCredentials, "accessToken" | "refreshToken">>;

export interface UpdateGoogleCredentialsInput {
  userId: UserId;
  updates: GoogleCredentialsUpdates;
}

export interface UpdateGoogleCredentialsOutput {
  googleCredentials: GoogleCredentials;
}

export interface GetGoogleCredentialsInput {
  userId: string;
}

export interface GetGoogleCredentialsOutput {
  googleCredentials: GoogleCredentials;
}

export interface DeleteGoogleCredentialsInput {
  userId: string;
}

export type DeleteGoogleCredentialsOutput = void;
