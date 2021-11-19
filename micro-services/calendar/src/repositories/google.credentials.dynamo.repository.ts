import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, UserId } from "@yac/util";
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

      const sk: Sk = `${EntityType.GoogleCredentials}-${googleCredentials.accountId}`;

      const googleCredentialsEntity: RawGoogleCredentials = {
        entityType: EntityType.GoogleCredentials,
        pk: googleCredentials.userId,
        sk,
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

      const { userId, accountId } = params;

      const sk: Sk = `${EntityType.GoogleCredentials}-${accountId}`;

      const googleCredentials = await this.get<GoogleCredentials>({ Key: { pk: userId, sk } }, "Google Credentials");

      return { googleCredentials };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGoogleCredentials", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getGoogleCredentialsByUserId(params: GetGoogleCredentialsByUserIdInput): Promise<GetGoogleCredentialsByUserIdOutput> {
    try {
      this.loggerService.trace("getGoogleCredentialsByUserId called", { params }, this.constructor.name);

      const { userId } = params;

      const { Items: googleCredentials = [] } = await this.query({
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :googleCredentials)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": userId,
          ":googleCredentials": EntityType.GoogleCredentials,
        },
      });

      return { googleCredentials };
    } catch (error: unknown) {
      this.loggerService.error("Error in getGoogleCredentialsByUserId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateGoogleCredentials(params: UpdateGoogleCredentialsInput): Promise<UpdateGoogleCredentialsOutput> {
    try {
      this.loggerService.trace("updateGoogleCredentials called", { params }, this.constructor.name);

      const { userId, accountId, updates } = params;

      const sk: Sk = `${EntityType.GoogleCredentials}-${accountId}`;

      const googleCredentials = await this.partialUpdate(userId, sk, updates);
      return { googleCredentials };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateGoogleCredentials", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async upsertGoogleCredentials(params: UpsertGoogleCredentialsInput): Promise<UpsertGoogleCredentialsOutput> {
    try {
      this.loggerService.trace("upsertGoogleCredentials called", { params }, this.constructor.name);

      const { googleCredentials } = params;

      const sk: Sk = `${EntityType.GoogleCredentials}-${googleCredentials.accountId}`;

      await this.partialUpdate<GoogleCredentials & { entityType: EntityType.GoogleCredentials }>(googleCredentials.userId, sk, { ...googleCredentials, entityType: EntityType.GoogleCredentials });

      return { googleCredentials };
    } catch (error: unknown) {
      this.loggerService.error("Error in upsertGoogleCredentials", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteGoogleCredentials(params: DeleteGoogleCredentialsInput): Promise<DeleteGoogleCredentialsOutput> {
    try {
      this.loggerService.trace("deleteGoogleCredentials called", { params }, this.constructor.name);

      const { userId, accountId } = params;

      const sk: Sk = `${EntityType.GoogleCredentials}-${accountId}`;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: userId, sk },
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
  getGoogleCredentialsByUserId(params: GetGoogleCredentialsByUserIdInput): Promise<GetGoogleCredentialsByUserIdOutput>;
  updateGoogleCredentials(params: UpdateGoogleCredentialsInput): Promise<UpdateGoogleCredentialsOutput>;
  upsertGoogleCredentials(params: UpsertGoogleCredentialsInput): Promise<UpsertGoogleCredentialsOutput>;
  deleteGoogleCredentials(params: DeleteGoogleCredentialsInput): Promise<DeleteGoogleCredentialsOutput>;
}

type GoogleCredentialsRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export interface GoogleCredentials {
  userId: UserId;
  accountId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  idToken: string;
  tokenType: string;
  expiryDate: number;
  scope: string;
}

// `${EntityType.GoogleCredentials}-${accountId}`
type Sk = `${EntityType.GoogleCredentials}-${string}`;
export interface RawGoogleCredentials extends GoogleCredentials {
  entityType: EntityType.GoogleCredentials;
  pk: UserId;
  sk: Sk;
}

export interface CreateGoogleCredentialsInput {
  googleCredentials: GoogleCredentials;
}

export interface CreateGoogleCredentialsOutput {
  googleCredentials: GoogleCredentials;
}

export interface UpsertGoogleCredentialsInput {
  googleCredentials: GoogleCredentials;
}

export interface UpsertGoogleCredentialsOutput {
  googleCredentials: GoogleCredentials;
}

export type GoogleCredentialsUpdates = Partial<Omit<GoogleCredentials, "userId" | "email">>;

export interface UpdateGoogleCredentialsInput {
  userId: UserId;
  accountId: string;
  updates: GoogleCredentialsUpdates;
}

export interface UpdateGoogleCredentialsOutput {
  googleCredentials: GoogleCredentials;
}

export interface GetGoogleCredentialsInput {
  userId: string;
  accountId: string;
}

export interface GetGoogleCredentialsOutput {
  googleCredentials: GoogleCredentials;
}

export interface GetGoogleCredentialsByUserIdInput {
  userId: string;
}

export interface GetGoogleCredentialsByUserIdOutput {
  googleCredentials: GoogleCredentials[];
}

export interface DeleteGoogleCredentialsInput {
  userId: string;
  accountId: string;
}

export type DeleteGoogleCredentialsOutput = void;
