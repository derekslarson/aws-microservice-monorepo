import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface, Role } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { ConversationRepositoryInterface } from "../repositories/conversation.dynamo.repository";
import { ChannelConversation, Conversation, DmConversation } from "../models/conversation.model";
import { ConversationType } from "../enums/conversationType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";

@injectable()
export class ConversationService implements ConversationServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ConversationRepositoryInterface) private conversationRepository: ConversationRepositoryInterface,
  ) {}

  public async createDmConversation(params: CreateDmConversationInput): Promise<CreateDmConversationOutput> {
    try {
      this.loggerService.trace("createDmConversation called", { params }, this.constructor.name);

      const { userId, friendId } = params;

      const conversationId = `${KeyPrefix.DmConversation}${[ userId, friendId ].sort().join("-")}`;

      const conversation: DmConversation = {
        id: conversationId,
        type: ConversationType.DM,

      };

      await this.conversationRepository.createConversation({ conversation });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createDmConversation", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async createChannelConversation(params: CreateChannelConversationInput): Promise<CreateChannelConversationOutput> {
    try {
      this.loggerService.trace("createChannelConversation called", { params }, this.constructor.name);

      const { name, createdBy, teamId } = params;

      const conversationId = `${KeyPrefix.ChannelConversation}${this.idService.generateId()}`;

      const conversation: ChannelConversation = {
        id: conversationId,
        name,
        createdBy,
        type: ConversationType.Channel,
        ...(teamId && { teamId }),
      };

      await this.conversationRepository.createConversation({ conversation });

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

      const { conversation } = await this.conversationRepository.getConversation({ conversationId });

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

      const { conversations } = await this.conversationRepository.getConversations({ conversationIds });

      const conversationMap = conversations.reduce((acc: { [key: string]: Conversation; }, conversation) => {
        acc[conversation.id] = conversation;

        return acc;
      }, {});

      const sortedConversations = conversationIds.map((conversationId) => conversationMap[conversationId]);

      return { conversations: sortedConversations };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversations", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationsByTeamId(params: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput> {
    try {
      this.loggerService.trace("getConversationsByTeamId called", { params }, this.constructor.name);

      const { teamId, exclusiveStartKey } = params;

      const { conversations, lastEvaluatedKey } = await this.conversationRepository.getConversationsByTeamId({ teamId, exclusiveStartKey });

      return { conversations, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByTeamId", { error, params }, this.constructor.name);

      throw error;
    }
  }

  // public async addUserToConversation(addUserToConversationInput: AddUserToConversationInput): Promise<AddUserToConversationOutput> {
  //   try {
  //     this.loggerService.trace("addUserToConversation called", { addUserToConversationInput }, this.constructor.name);

  //     const { conversationId, userId, role } = addUserToConversationInput;

  //     const conversationUserRelationship: ConversationUserRelationship = {
  //       conversationId,
  //       userId,
  //       role,
  //       muted: false,
  //       updatedAt: new Date().toISOString(),
  //     };

  //     await this.conversationRepository.createConversationUserRelationship({ conversationUserRelationship });

  //     return { conversationUserRelationship };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in addUserToConversation", { error, addUserToConversationInput }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async removeUserFromConversation(removeUserFromConversationInput: RemoveUserFromConversationInput): Promise<RemoveUserFromConversationOutput> {
  //   try {
  //     this.loggerService.trace("removeUserFromConversation called", { removeUserFromConversationInput }, this.constructor.name);

  //     const { conversationId, userId } = removeUserFromConversationInput;

  //     await this.conversationRepository.deleteConversationUserRelationship({ conversationId, userId });
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in removeUserFromConversation", { error, removeUserFromConversationInput }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async getConversationsByUserId(getConversationsByUserIdInput: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput> {
  //   try {
  //     this.loggerService.trace("getConversationsByUserId called", { getConversationsByUserIdInput }, this.constructor.name);

  //     const { userId, exclusiveStartKey } = getConversationsByUserIdInput;

  //     const { conversations, lastEvaluatedKey } = await this.conversationRepository.getConversationsByUserId({ userId, exclusiveStartKey });

  //     return { conversations, lastEvaluatedKey };
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in getConversationsByUserId", { error, getConversationsByUserIdInput }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async isConversationMember(isConversationMemberInput: IsConversationMemberInput): Promise<IsConversationMemberOutput> {
  //   try {
  //     this.loggerService.trace("isConversationMember called", { isConversationMemberInput }, this.constructor.name);

  //     const { conversationId, userId } = isConversationMemberInput;

  //     await this.conversationRepository.getConversationUserRelationship({ conversationId, userId });

  //     return { isConversationMember: true };
  //   } catch (error: unknown) {
  //     if (error instanceof NotFoundError) {
  //       return { isConversationMember: false };
  //     }

  //     this.loggerService.error("Error in isConversationMember", { error, isConversationMemberInput }, this.constructor.name);

  //     throw error;
  //   }
  // }

  // public async isConversationAdmin(isConversationAdminInput: IsConversationAdminInput): Promise<IsConversationAdminOutput> {
  //   try {
  //     this.loggerService.trace("isConversationAdmin called", { isConversationAdminInput }, this.constructor.name);

  //     const { conversationId, userId } = isConversationAdminInput;

  //     const { conversationUserRelationship } = await this.conversationRepository.getConversationUserRelationship({ conversationId, userId });

  //     const isConversationAdmin = conversationUserRelationship.role === Role.Admin;

  //     return { isConversationAdmin };
  //   } catch (error: unknown) {
  //     if (error instanceof NotFoundError) {
  //       return { isConversationAdmin: false };
  //     }

  //     this.loggerService.error("Error in isConversationAdmin", { error, isConversationAdminInput }, this.constructor.name);

  //     throw error;
  //   }
  // }
}

export interface ConversationServiceInterface {
  createDmConversation(params: CreateDmConversationInput): Promise<CreateDmConversationOutput>;
  createChannelConversation(params: CreateChannelConversationInput): Promise<CreateChannelConversationOutput>;
  getConversation(params: GetConversationInput): Promise<GetConversationOutput>;
  getConversations(params: GetConversationsInput): Promise<GetConversationsOutput>;
  getConversationsByTeamId(params: GetConversationsByTeamIdInput): Promise<GetConversationsByTeamIdOutput>;
  // addUserToConversation(addUserToConversationInput: AddUserToConversationInput): Promise<AddUserToConversationOutput>;
  // removeUserFromConversation(removeUserFromConversationInput: RemoveUserFromConversationInput): Promise<RemoveUserFromConversationOutput>;
  // getConversationsByUserId(getConversationsByUserIdInput: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput>;
  // isConversationMember(isConversationMemberInput: IsConversationMemberInput): Promise<IsConversationMemberOutput>;
  // isConversationAdmin(isConversationAdminInput: IsConversationAdminInput): Promise<IsConversationAdminOutput>;
}

export interface CreateDmConversationInput {
  userId: string;
  friendId: string;
}

export interface CreateDmConversationOutput {
  conversation: DmConversation;
}

export interface CreateChannelConversationInput {
  name: string;
  createdBy: string;
  teamId?: string;
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

export interface GetConversationsByTeamIdInput {
  teamId: string;
  exclusiveStartKey?: string;
}

export interface GetConversationsByTeamIdOutput {
  conversations: Conversation[];
  lastEvaluatedKey?: string;
}

// export interface AddUserToConversationInput {
//   conversationId: string;
//   userId: string;
//   role: Role;
// }

// export interface AddUserToConversationOutput {
//   conversationUserRelationship: ConversationUserRelationship;
// }

// export interface RemoveUserFromConversationInput {
//   conversationId: string;
//   userId: string;
// }

// export type RemoveUserFromConversationOutput = void;

// export interface GetConversationsByUserIdInput {
//   userId: string;
//   exclusiveStartKey?: string;
// }

// export interface GetConversationsByUserIdOutput {
//   conversations: WithRole<Conversation>[];
//   lastEvaluatedKey?: string;
// }

// export interface IsConversationMemberInput {
//   userId: string;
//   conversationId: string;
// }

// export interface IsConversationMemberOutput {
//   isConversationMember: boolean;
// }

// export interface IsConversationAdminInput {
//   userId: string;
//   conversationId: string;
// }

// export interface IsConversationAdminOutput {
//   isConversationAdmin: boolean;
// }
