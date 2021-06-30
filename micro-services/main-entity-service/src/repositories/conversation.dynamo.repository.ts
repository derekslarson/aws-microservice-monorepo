import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { ChannelConversation, Conversation, DmConversation } from "../models/conversation.model";
import { EntityType } from "../enums/entityType.enum";
import { RawEntity } from "../types/raw.entity.type";

@injectable()
export class ConversationDynamoRepository extends BaseDynamoRepositoryV2<Conversation> implements ConversationRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ConversationRepositoryConfigType,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);
  }

  public async createDmConversation(params: CreateDmConversationInput): Promise<CreateDmConversationOutput> {
    try {
      this.loggerService.trace("createDmConversation called", { params }, this.constructor.name);

      const { conversation } = params;

      const conversationEntity: RawEntity<DmConversation> = {
        type: EntityType.DmConversation,
        pk: conversation.id,
        sk: conversation.id,
        ...conversation,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        Item: conversationEntity,
      }).promise();

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createDmConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createChannelConversation(params: CreateChannelConversationInput): Promise<CreateChannelConversationOutput> {
    try {
      this.loggerService.trace("createChannelConversation called", { params }, this.constructor.name);

      const { conversation } = params;

      const conversationEntity: RawEntity<ChannelConversation> = {
        type: EntityType.ChannelConversation,
        pk: conversation.id,
        sk: conversation.id,
        ...conversation,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: conversationEntity,
      }).promise();

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createChannelConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversation(params: GetConversationInput): Promise<GetConversationOutput> {
    try {
      this.loggerService.trace("getConversation called", { params }, this.constructor.name);

      const { conversationId } = params;

      const conversation = await this.get({ Key: { pk: conversationId, sk: conversationId } });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversations(params: GetConversationsInput): Promise<GetConversationsOutput> {
    try {
      this.loggerService.trace("getConversations called", { params }, this.constructor.name);

      const { conversationIds } = params;

      const conversations = await this.batchGet({ Keys: conversationIds.map((conversationId) => ({ pk: conversationId, sk: conversationId })) });

      return { conversations };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversations", { error, params }, this.constructor.name);

      throw error;
    }
  }

  // public async createConversationUserRelationship(params: CreateConversationUserRelationshipInput): Promise<CreateConversationUserRelationshipOutput> {
  //   try {
  //     this.loggerService.trace("createConversationUserRelationship called", { params }, this.constructor.name);

  //     const { conversationUserRelationship } = params;

  //     const conversationUserRelationshipEntity: RawEntity<ConversationUserRelationship> = {
  //       pk: conversationUserRelationship.conversationId,
  //       sk: conversationUserRelationship.userId,
  //       gsi1pk: conversationUserRelationship.userId,
  //       gsi1sk: `${KeyPrefix.Time}${conversationUserRelationship.updatedAt}`,
  //       type: EntityType.ConversationUserRelationship,
  //       ...conversationUserRelationship,
  //     };

  //     await this.documentClient.put({
  //       TableName: this.tableName,
  //       Item: conversationUserRelationshipEntity,
  //     }).promise();

  //     return { conversationUserRelationship };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in createConversationUserRelationship", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async getConversationUserRelationship(params: GetConversationUserRelationshipInput): Promise<GetConversationUserRelationshipOutput> {
  //   try {
  //     this.loggerService.trace("getConversationUserRelationship called", { params }, this.constructor.name);

  //     const { conversationId, userId } = params;

  //     const { unreadMessages, ...rest } = await this.get<DynamoSetValues<ConversationUserRelationship, "unreadMessages">>({ Key: { pk: conversationId, sk: userId } }, "Conversation-User Relationship");

  //     const conversationUserRelationship = {
  //       ...rest,
  //       ...(unreadMessages && { unreadMessages: unreadMessages.values }),
  //     };

  //     return { conversationUserRelationship };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getConversationUserRelationship", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async deleteConversationUserRelationship(params: DeleteConversationUserRelationshipInput): Promise<DeleteConversationUserRelationshipOutput> {
  //   try {
  //     this.loggerService.trace("deleteConversationUserRelationship called", { params }, this.constructor.name);

  //     const { conversationId, userId } = params;

  //     await this.documentClient.delete({
  //       TableName: this.tableName,
  //       Key: { pk: conversationId, sk: userId },
  //     }).promise();
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in deleteConversationUserRelationship", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async getConversationsByUserId(params: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput> {
  //   try {
  //     this.loggerService.trace("getConversationsByUserId called", { params }, this.constructor.name);

  //     const { userId, exclusiveStartKey } = params;

  //     const { Items: conversationUserRelationships, LastEvaluatedKey } = await this.query<ConversationUserRelationship>({
  //       ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
  //       IndexName: this.gsiOneIndexName,
  //       KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :time)",
  //       ExpressionAttributeNames: {
  //         "#gsi1pk": "gsi1pk",
  //         "#gsi1sk": "gsi1sk",
  //       },
  //       ExpressionAttributeValues: {
  //         ":gsi1pk": userId,
  //         ":time": KeyPrefix.Time,
  //       },
  //     });

  //     const unsortedConversations = await this.batchGet<Conversation>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

  //     const conversationsWithRole = this.addRoleToConversations<Conversation>(conversationUserRelationships, unsortedConversations);

  //     return {
  //       conversations: conversationsWithRole,
  //       ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
  //     };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getConversationsByUserId", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async getUnreadConversationsByUserId(params: GetUnreadConversationsByUserIdInput): Promise<GetUnreadConversationsByUserIdOutput> {
  //   try {
  //     this.loggerService.trace("getUnreadConversationsByUserId called", { params }, this.constructor.name);

  //     const { userId, exclusiveStartKey } = params;

  //     const { Items: conversationUserRelationships, LastEvaluatedKey } = await this.query<ConversationUserRelationship>({
  //       ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
  //       IndexName: this.gsiOneIndexName,
  //       FilterExpression: "attribute_exists(unreadMessages)",
  //       KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :conversation)",
  //       ExpressionAttributeNames: {
  //         "#gsi1pk": "gsi1pk",
  //         "#gsi1sk": "gsi1sk",
  //       },
  //       ExpressionAttributeValues: {
  //         ":gsi1pk": userId,
  //         ":conversation": KeyPrefix.Conversation,
  //       },
  //     });

  //     const unsortedConversations = await this.batchGet<Conversation>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

  //     const conversationsWithRole = this.addRoleToConversations(conversationUserRelationships, unsortedConversations);

  //     return {
  //       conversations: conversationsWithRole,
  //       ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
  //     };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getUnreadConversationsByUserId", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async getDmConversationsByUserId(params: GetDmConversationsByUserIdInput): Promise<GetDmConversationsByUserIdOutput> {
  //   try {
  //     this.loggerService.trace("getDmConversationsByUserId called", { params }, this.constructor.name);

  //     const { userId, exclusiveStartKey } = params;

  //     const { Items: conversationUserRelationships, LastEvaluatedKey } = await this.query<ConversationUserRelationship>({
  //       ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
  //       IndexName: this.gsiOneIndexName,
  //       KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :conversation)",
  //       ExpressionAttributeNames: {
  //         "#gsi1pk": "gsi1pk",
  //         "#gsi1sk": "gsi1sk",
  //       },
  //       ExpressionAttributeValues: {
  //         ":gsi1pk": userId,
  //         ":conversation": KeyPrefix.DmConversation,
  //       },
  //     });

  //     const unsortedConversations = await this.batchGet<DmConversation>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

  //     const conversationsWithRole = this.addRoleToConversations<DmConversation>(conversationUserRelationships, unsortedConversations);

  //     return {
  //       conversations: conversationsWithRole,
  //       ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
  //     };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getDmConversationsByUserId", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async getChannelConversationsByUserId(params: GetChannelConversationsByUserIdInput): Promise<GetChannelConversationsByUserIdOutput> {
  //   try {
  //     this.loggerService.trace("getChannelConversationsByUserId called", { params }, this.constructor.name);

  //     const { userId, exclusiveStartKey } = params;

  //     const { Items: conversationUserRelationships, LastEvaluatedKey } = await this.query<ConversationUserRelationship>({
  //       ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
  //       IndexName: this.gsiOneIndexName,
  //       KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :conversation)",
  //       ExpressionAttributeNames: {
  //         "#gsi1pk": "gsi1pk",
  //         "#gsi1sk": "gsi1sk",
  //       },
  //       ExpressionAttributeValues: {
  //         ":gsi1pk": userId,
  //         ":conversation": KeyPrefix.ChannelConversation,
  //       },
  //     });

  //     const unsortedConversations = await this.batchGet<ChannelConversation>({ Keys: conversationUserRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

  //     const conversationsWithRole = this.addRoleToConversations<ChannelConversation>(conversationUserRelationships, unsortedConversations);

  //     return {
  //       conversations: conversationsWithRole,
  //       ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
  //     };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getChannelConversationsByUserId", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async getConversationsByTeamId(params: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput> {
  //   try {
  //     this.loggerService.trace("getConversationsByTeamId called", { params }, this.constructor.name);

  //     const { userId, exclusiveStartKey } = params;

  //     const { Items: teamConversationRelationships, LastEvaluatedKey } = await this.query<TeamConversationRelationship>({
  //       ...(exclusiveStartKey && { ExclusiveStartKey: this.decodeExclusiveStartKey(exclusiveStartKey) }),
  //       KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :conversation)",
  //       ExpressionAttributeNames: {
  //         "#pk": "pk",
  //         "#sk": "sk",
  //       },
  //       ExpressionAttributeValues: {
  //         ":pk": userId,
  //         ":conversation": KeyPrefix.Conversation,
  //       },
  //     });

  //     const conversations = await this.batchGet<Conversation>({ Keys: teamConversationRelationships.map((relationship) => ({ pk: relationship.conversationId, sk: relationship.conversationId })) });

  //     return {
  //       conversations,
  //       ...(LastEvaluatedKey && { lastEvaluatedKey: this.encodeLastEvaluatedKey(LastEvaluatedKey) }),
  //     };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getConversationsByUserId", { error, params }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // private addRoleToConversations<T extends Conversation = Conversation>(conversationUserRelationships: ConversationUserRelationship[], conversations: T[]): WithRole<T>[] {
  //   try {
  //     this.loggerService.trace("addRoleToConversations called", { conversationUserRelationships, conversations }, this.constructor.name);

  //     const conversationMap = conversations.reduce((acc: { [key: string]: T; }, conversation) => {
  //       acc[conversation.id] = conversation;

  //       return acc;
  //     }, {});

  //     const conversationsWithRole = conversationUserRelationships.map((relationship) => {
  //       const conversation = conversationMap[relationship.conversationId];

  //       return {
  //         ...conversation,
  //         role: relationship.role,
  //       };
  //     });

  //     return conversationsWithRole;
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in addRoleToConversations", { error, conversationUserRelationships, conversations }, this.constructor.name);

  //     throw error;
  //   }
  // }
}

export interface ConversationRepositoryInterface {
  createDmConversation(params: CreateDmConversationInput): Promise<CreateDmConversationOutput>;
  createChannelConversation(params: CreateChannelConversationInput): Promise<CreateChannelConversationOutput>;
  getConversation(params: GetConversationInput): Promise<GetConversationOutput>;
  getConversations(params: GetConversationsInput): Promise<GetConversationsOutput>;
  // createConversationUserRelationship(params: CreateConversationUserRelationshipInput): Promise<CreateConversationUserRelationshipOutput>;
  // getConversationUserRelationship(params: GetConversationUserRelationshipInput): Promise<GetConversationUserRelationshipOutput>;
  // deleteConversationUserRelationship(params: DeleteConversationUserRelationshipInput): Promise<DeleteConversationUserRelationshipOutput>;
  // getConversationsByUserId(params: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput>;
  // getUnreadConversationsByUserId(params: GetUnreadConversationsByUserIdInput): Promise<GetUnreadConversationsByUserIdOutput>;
  // getDmConversationsByUserId(params: GetDmConversationsByUserIdInput): Promise<GetDmConversationsByUserIdOutput>;
  // getChannelConversationsByUserId(params: GetChannelConversationsByUserIdInput): Promise<GetChannelConversationsByUserIdOutput>;
  // getConversationsByTeamId(params: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput>;
}

type ConversationRepositoryConfigType = Pick<EnvConfigInterface, "tableNames">;

export interface CreateDmConversationInput {
  conversation: DmConversation;
}

export interface CreateDmConversationOutput {
  conversation: DmConversation;
}

export interface CreateChannelConversationInput {
  conversation: ChannelConversation;
}

export interface CreateChannelConversationOutput {
  conversation: ChannelConversation;
}

export interface GetConversationInput {
  conversationId: string;
}

export interface GetConversationOutput {
  conversation: Conversation;
}

export interface GetConversationsInput {
  conversationIds: string[];
}

export interface GetConversationsOutput {
  conversations: Conversation[];
}

// export interface CreateConversationUserRelationshipInput {
//   conversationUserRelationship: ConversationUserRelationship;
// }

// export interface CreateConversationUserRelationshipOutput {
//   conversationUserRelationship: ConversationUserRelationship;
// }

// export interface GetConversationUserRelationshipInput {
//   conversationId: string;
//   userId: string;
// }

// export interface GetConversationUserRelationshipOutput {
//   conversationUserRelationship: ConversationUserRelationship;
// }

// export interface DeleteConversationUserRelationshipInput {
//   conversationId: string;
//   userId: string;
// }

// export type DeleteConversationUserRelationshipOutput = void;

// export interface GetConversationsByUserIdInput {
//   userId: string;
//   exclusiveStartKey?: string;
// }

// export interface GetConversationsByUserIdOutput {
//   conversations: WithRole<Conversation>[];
//   lastEvaluatedKey?: string;
// }

// export interface GetUnreadConversationsByUserIdInput {
//   userId: string;
//   exclusiveStartKey?: string;
// }

// export interface GetUnreadConversationsByUserIdOutput {
//   conversations: WithRole<Conversation>[];
//   lastEvaluatedKey?: string;
// }

// export interface GetDmConversationsByUserIdInput {
//   userId: string;
//   exclusiveStartKey?: string;
// }

// export interface GetDmConversationsByUserIdOutput {
//   conversations: WithRole<DmConversation>[];
//   lastEvaluatedKey?: string;
// }

// export interface GetChannelConversationsByUserIdInput {
//   userId: string;
//   exclusiveStartKey?: string;
// }

// export interface GetChannelConversationsByUserIdOutput {
//   conversations: WithRole<ChannelConversation>[];
//   lastEvaluatedKey?: string;
// }

// export interface GetConversationsByTeamIdInput {
//   userId: string;
//   exclusiveStartKey?: string;
// }
// export interface GetConversationsByTeamIdOutput {
//   conversations: Conversation[];
//   lastEvaluatedKey?: string;
// }
