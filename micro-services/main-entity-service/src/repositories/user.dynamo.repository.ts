import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface, User, TeamUserRelationship, ConversationUserRelationship, IdPrefix, EntityType } from "@yac/core";

import { RawEntity } from "@yac/core/src/types/raw.entity.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserDynamoRepository extends BaseDynamoRepositoryV2<User> implements UserRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRepositoryConfigType,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, idService, loggerService);
  }

  public async createUser(user: User): Promise<User> {
    try {
      this.loggerService.trace("createUser called", { user }, this.constructor.name);

      const id = `${IdPrefix.User}-${user.id}`;

      const userEntity: RawEntity<User> = {
        type: EntityType.User,
        pk: id,
        sk: id,
        id,
        email: user.email,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: userEntity,
      }).promise();

      return this.cleanse(userEntity);
    } catch (error: unknown) {
      this.loggerService.error("Error in createUser", { error, user }, this.constructor.name);

      throw error;
    }
  }

  public async getUser(userId: string): Promise<User> {
    try {
      this.loggerService.trace("getUser called", { userId }, this.constructor.name);

      const user = await this.get<User>({ Key: { pk: userId, sk: userId } }, "User");

      return user;
    } catch (error: unknown) {
      this.loggerService.error("Error in getUser", { error, userId }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByTeamId(teamId: string): Promise<User[]> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { teamId }, this.constructor.name);

      const { Items: teamUserRelationships } = await this.query<TeamUserRelationship>({
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": teamId,
          ":user": IdPrefix.User,
        },
      });

      const users = await this.batchGet<User>({ Keys: teamUserRelationships.map((relationship) => ({ pk: relationship.userId, sk: relationship.userId })) });

      return users;
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, teamId }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByConversationId(conversationId: string): Promise<User[]> {
    try {
      this.loggerService.trace("getUsersByConversationId called", { conversationId }, this.constructor.name);

      const { Items: conversationUserRelationships } = await this.query<ConversationUserRelationship>({
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": conversationId,
          ":user": IdPrefix.User,
        },
      });

      const users = await this.batchGet<User>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.userId, sk: relationship.userId })) });

      return users;
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByConversationId", { error, conversationId }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRepositoryInterface {
  createUser(user: User): Promise<User>;
  getUser(userId: string): Promise<User>;
  getUsersByTeamId(teamId: string): Promise<User[]>;
  getUsersByConversationId(teamId: string): Promise<User[]>;
}

type UserRepositoryConfigType = Pick<EnvConfigInterface, "tableNames">;
