import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";
import { RawEntity } from "../types/raw.entity.type";

@injectable()
export class UserDynamoRepository extends BaseDynamoRepositoryV2<User> implements UserRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
  }

  public async createUser(params: CreateUserInput): Promise<CreateUserOutput> {
    try {
      this.loggerService.trace("createUser called", { params }, this.constructor.name);

      const { user } = params;

      const userEntity: RawEntity<User> = {
        entityType: EntityType.User,
        pk: user.id,
        sk: user.id,
        ...user,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: userEntity,
      }).promise();

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in createUser", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUser(params: GetUserInput): Promise<GetUserOutput> {
    try {
      this.loggerService.trace("getUser called", { params }, this.constructor.name);

      const { userId } = params;

      const user = await this.get({ Key: { pk: userId, sk: userId } }, "User");

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUser", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUsers(params: GetUsersInput): Promise<GetUsersOutput> {
    try {
      this.loggerService.trace("getUsers called", { params }, this.constructor.name);

      const { userIds } = params;

      const users = await this.batchGet({ Keys: userIds.map((userId) => ({ pk: userId, sk: userId })) });

      return { users };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsers", { error, params }, this.constructor.name);

      throw error;
    }
  }

  // public async getUsersByTeamId(teamId: string, exclusiveStartKey?: string): Promise<{ users: WithRole<User>[]; lastEvaluatedKey?: string; }> {
  //   try {
  //     this.loggerService.trace("getUsersByTeamId called", { teamId }, this.constructor.name);

  //     const { Items: teamUserRelationships, LastEvaluatedKey } = await this.query<TeamUserRelationship>({
  //       ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
  //       KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
  //       ExpressionAttributeNames: {
  //         "#pk": "pk",
  //         "#sk": "sk",
  //       },
  //       ExpressionAttributeValues: {
  //         ":pk": teamId,
  //         ":user": KeyPrefix.User,
  //       },
  //     });

  //     const unsortedUsers = await this.batchGet<User>({ Keys: teamUserRelationships.map((relationship) => ({ pk: relationship.userId, sk: relationship.userId })) });

  //     const usersWithRole = this.addRoleToUsers(teamUserRelationships, unsortedUsers);

  //     return {
  //       users: usersWithRole,
  //       ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
  //     };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getUsersByTeamId", { error, teamId }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async getUsersByConversationId(conversationId: string, exclusiveStartKey?: string): Promise<{ users: WithRole<User>[]; lastEvaluatedKey?: string; }> {
  //   try {
  //     this.loggerService.trace("getUsersByConversationId called", { conversationId }, this.constructor.name);

  //     const { Items: conversationUserRelationships, LastEvaluatedKey } = await this.query<ConversationUserRelationship>({
  //       ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
  //       KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :user)",
  //       ExpressionAttributeNames: {
  //         "#pk": "pk",
  //         "#sk": "sk",
  //       },
  //       ExpressionAttributeValues: {
  //         ":pk": conversationId,
  //         ":user": KeyPrefix.User,
  //       },
  //     });

  //     const unsortedUsers = await this.batchGet<User>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.userId, sk: relationship.userId })) });

  //     const usersWithRole = this.addRoleToUsers(conversationUserRelationships, unsortedUsers);

  //     return {
  //       users: usersWithRole,
  //       ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
  //     };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getUsersByConversationId", { error, conversationId }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // private addRoleToUsers(relationships: Array<ConversationUserRelationship | TeamUserRelationship>, users: User[]): WithRole<User>[] {
  //   try {
  //     this.loggerService.trace("addRoleToUsers called", { relationships, users }, this.constructor.name);

  //     const userMap = users.reduce((acc: { [key: string]: User; }, user) => {
  //       acc[user.id] = user;

  //       return acc;
  //     }, {});

  //     const usersWithRole = relationships.map((relationship) => {
  //       const relationshipId = this.isConversationUserRelationship(relationship) ? relationship.conversationId : relationship.teamId;

  //       const user = userMap[relationshipId];

  //       return {
  //         ...user,
  //         role: relationship.role,
  //       };
  //     });

  //     return usersWithRole;
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in addRoleToUsers", { error, relationships, users }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // private isConversationUserRelationship(relationship: ConversationUserRelationship | TeamUserRelationship): relationship is ConversationUserRelationship {
  //   try {
  //     this.loggerService.trace("addRoleToUsers called", { relationship }, this.constructor.name);

  //     return !!(relationship as ConversationUserRelationship).conversationId;
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in addRoleToUsers", { error, relationship }, this.constructor.name);

  //     throw error;
  //   }
  // }
}

export interface UserRepositoryInterface {
  createUser(params: CreateUserInput): Promise<CreateUserOutput>;
  getUser(params: GetUserInput): Promise<GetUserOutput>;
  getUsers(params: GetUsersInput): Promise<GetUsersOutput>;
}

type UserRepositoryConfig = Pick<EnvConfigInterface, "tableNames">;

export interface User {
  id: string;
  email: string;
}

export interface CreateUserInput {
  user: User;
}

export interface CreateUserOutput {
  user: User;
}

export interface GetUserInput {
  userId: string;
}

export interface GetUserOutput {
  user: User;
}

export interface GetUsersInput {
  userIds: string[];
}

export interface GetUsersOutput {
  users: User[];
}
