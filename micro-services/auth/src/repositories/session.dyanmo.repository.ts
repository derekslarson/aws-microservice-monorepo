import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, NotFoundError, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class SessionDynamoRepository extends BaseDynamoRepositoryV2<Session> implements SessionRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: SessionRepositoryConfig,
  ) {
    super(documentClientFactory, config.tableNames.auth, loggerService);

    this.gsiOneIndexName = config.globalSecondaryIndexNames.one;
  }

  public async createSession(params: CreateSessionInput): Promise<CreateSessionOutput> {
    try {
      this.loggerService.trace("createSession called", { params }, this.constructor.name);

      const { session } = params;

      const sk: SkAndGsi1sk = `${EntityType.Session}-${session.sessionId}`;
      const gsi1sk: SkAndGsi1sk = `${EntityType.Session}-${session.refreshToken}`;

      const sessionEntity: RawSession = {
        entityType: EntityType.Session,
        pk: session.clientId,
        sk,
        gsi1pk: session.clientId,
        gsi1sk,
        ...session,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: sessionEntity,
      }).promise();

      return { session };
    } catch (error: unknown) {
      this.loggerService.error("Error in createSession", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getSession(params: GetSessionInput): Promise<GetSessionOutput> {
    try {
      this.loggerService.trace("getSession called", { params }, this.constructor.name);

      const { clientId, sessionId } = params;

      const sk: SkAndGsi1sk = `${EntityType.Session}-${sessionId}`;

      const session = await this.get({ Key: { pk: clientId, sk } }, "Session");

      return { session };
    } catch (error: unknown) {
      this.loggerService.error("Error in getSession", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getSessionByRefreshToken(params: GetSessionByRefreshTokenInput): Promise<GetSessionByRefreshTokenOutput> {
    try {
      this.loggerService.trace("getSession called", { params }, this.constructor.name);

      const { clientId, refreshToken } = params;

      const gsi1sk: SkAndGsi1sk = `${EntityType.Session}-${refreshToken}`;

      const { Items: [ session ] } = await this.query({
        KeyConditionExpression: "#gsi1pk = :clientId AND #gsi1sk = :gsi1sk",
        IndexName: this.gsiOneIndexName,
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":clientId": clientId,
          ":gsi1sk": gsi1sk,
        },
      });

      if (!session) {
        throw new NotFoundError("Session not found.");
      }

      return { session };
    } catch (error: unknown) {
      this.loggerService.error("Error in getSession", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateSession(params: UpdateSessionInput): Promise<UpdateSessionOutput> {
    try {
      this.loggerService.trace("updateSession called", { params }, this.constructor.name);

      const { clientId, sessionId, updates } = params;

      const sk: SkAndGsi1sk = `${EntityType.Session}-${sessionId}`;

      const session = await this.partialUpdate(clientId, sk, updates);

      return { session };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateSession", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteSession(params: DeleteSessionInput): Promise<DeleteSessionOutput> {
    try {
      this.loggerService.trace("deleteSession called", { params }, this.constructor.name);

      const { clientId, sessionId } = params;

      const sk: SkAndGsi1sk = `${EntityType.Session}-${sessionId}`;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: clientId, sk },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteSession", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface SessionRepositoryInterface {
  createSession(params: CreateSessionInput): Promise<CreateSessionOutput>;
  getSession(params: GetSessionInput): Promise<GetSessionOutput>;
  getSessionByRefreshToken(params: GetSessionByRefreshTokenInput): Promise<GetSessionByRefreshTokenOutput>;
  updateSession(params: UpdateSessionInput): Promise<UpdateSessionOutput>;
  deleteSession(params: DeleteSessionInput): Promise<DeleteSessionOutput>;
}

type SessionRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface Session {
  clientId: string;
  sessionId: string;
  refreshToken: string;
  refreshTokenCreatedAt: string;
  refreshTokenExpiresAt: string;
  createdAt: string;
  userId: UserId;
  scope: string;
}

type SkAndGsi1sk = `${EntityType.Session}-${string}`;

export interface RawSession extends Session {
  entityType: EntityType.Session;
  // clientId
  pk: string;
  // `${EntityType.Session}-${sessionId}`
  sk: SkAndGsi1sk;
  // clientId
  gsi1pk: string;
  // `${EntityType.Session}-${refreshToken}`
  gsi1sk: SkAndGsi1sk;
}

export interface CreateSessionInput {
  session: Session;
}

export interface CreateSessionOutput {
  session: Session;
}

export interface GetSessionInput {
  clientId: string;
  sessionId: string;
}

export interface GetSessionOutput {
  session: Session;
}

export interface GetSessionByRefreshTokenInput {
  clientId: string;
  refreshToken: string;
}

export interface GetSessionByRefreshTokenOutput {
  session: Session;
}

export interface GetSessionByAuthorizationCodeInput {
  clientId: string;
  sessionId: string;
}

export interface GetSessionByAuthorizationCodeOutput {
  session: Session;
}

export interface UpdateSessionUpdates {
  refreshTokenExpiresAt?: string;
}

export interface UpdateSessionInput {
  clientId: string;
  sessionId: string;
  updates: UpdateSessionUpdates;
}

export interface UpdateSessionOutput {
  session: Session;
}

export interface DeleteSessionInput {
  clientId: string;
  sessionId: string;
}

export type DeleteSessionOutput = void;
