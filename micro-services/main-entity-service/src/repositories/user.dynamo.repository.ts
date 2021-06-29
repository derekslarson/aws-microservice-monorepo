import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface, User, TeamUserRelationship, ConversationUserRelationship, KeyPrefix, EntityType, WithRole } from "@yac/core";

import { RawEntity } from "@yac/core/src/types/raw.entity.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserDynamoRepository extends BaseDynamoRepositoryV2 implements UserRepositoryInterface {
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

      const id = `${KeyPrefix.User}${user.id}`;

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

  public async getUsersByTeamId(teamId: string, exclusiveStartKey?: string): Promise<{ users: WithRole<User>[]; lastEvaluatedKey?: string; }> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { teamId }, this.constructor.name);

      const { Items: teamUserRelationships, LastEvaluatedKey } = await this.query<TeamUserRelationship>({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": teamId,
          ":user": KeyPrefix.User,
        },
      });

      const users = await this.batchGet<User>({ Keys: teamUserRelationships.map((relationship) => ({ pk: relationship.userId, sk: relationship.userId })) });

      const usersWithRole = this.addRoleToUsers(teamUserRelationships, users);

      return {
        users: usersWithRole,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, teamId }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByConversationId(conversationId: string, exclusiveStartKey?: string): Promise<{ users: WithRole<User>[]; lastEvaluatedKey?: string; }> {
    try {
      this.loggerService.trace("getUsersByConversationId called", { conversationId }, this.constructor.name);

      const { Items: conversationUserRelationships, LastEvaluatedKey } = await this.query<ConversationUserRelationship>({
        ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
        KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
        },
        ExpressionAttributeValues: {
          ":pk": conversationId,
          ":user": KeyPrefix.User,
        },
      });

      const users = await this.batchGet<User>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.userId, sk: relationship.userId })) });

      const usersWithRole = this.addRoleToUsers(conversationUserRelationships, users);

      return {
        users: usersWithRole,
        ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByConversationId", { error, conversationId }, this.constructor.name);

      throw error;
    }
  }

  private addRoleToUsers(relationships: Array<ConversationUserRelationship | TeamUserRelationship>, users: User[]): WithRole<User>[] {
    try {
      this.loggerService.trace("addRoleToUsers called", { relationships, users }, this.constructor.name);

      const userMap = users.reduce((acc: { [key: string]: User; }, user) => {
        acc[user.id] = user;

        return acc;
      }, {});

      const usersWithRole = relationships.map((relationship) => {
        const relationshipId = this.isConversationUserRelationship(relationship) ? relationship.conversationId : relationship.teamId;

        const user = userMap[relationshipId];

        return {
          ...user,
          role: relationship.role,
        };
      });

      return usersWithRole;
    } catch (error: unknown) {
      this.loggerService.error("Error in addRoleToUsers", { error, relationships, users }, this.constructor.name);

      throw error;
    }
  }

  private isConversationUserRelationship(relationship: ConversationUserRelationship | TeamUserRelationship): relationship is ConversationUserRelationship {
    try {
      this.loggerService.trace("addRoleToUsers called", { relationship }, this.constructor.name);

      return !!(relationship as ConversationUserRelationship).conversationId;
    } catch (error: unknown) {
      this.loggerService.error("Error in addRoleToUsers", { error, relationship }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRepositoryInterface {
  createUser(user: User): Promise<User>;
  getUser(userId: string): Promise<User>;
  getUsersByTeamId(teamId: string, exclusiveStartKey?: string): Promise<{ users: WithRole<User>[]; lastEvaluatedKey?: string; }>;
  getUsersByConversationId(teamId: string, exclusiveStartKey?: string): Promise<{ users: WithRole<User>[]; lastEvaluatedKey?: string; }>;
}

type UserRepositoryConfigType = Pick<EnvConfigInterface, "tableNames">;
