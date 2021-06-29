import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface, NotFoundError, Role, WithRole } from "@yac/core";
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

  public async createDmConversation(createDmConversationInput: CreateDmConversationInput): Promise<CreateDmConversationOutput> {
    try {
      this.loggerService.trace("createDmConversation called", { createDmConversationInput }, this.constructor.name);

      const { userId, friendId } = createDmConversationInput;

      const conversationId = `${KeyPrefix.DmConversation}${[ userId, friendId ].sort().join("-")}`;

      const conversation: DmConversation = {
        id: conversationId,
        conversationType: ConversationType.DM,
      };

      await this.conversationRepository.createDmConversation({ conversation });

      await Promise.all([ userId, friendId ].map((id) => this.addUserToConversation({ conversationId, userId: id, role: Role.Admin })));

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createDmConversation", { error, createDmConversationInput }, this.constructor.name);

      throw error;
    }
  }

  public async createChannelConversation(createChannelConversationInput: CreateChannelConversationInput): Promise<CreateChannelConversationOutput> {
    try {
      this.loggerService.trace("createChannelConversation called", { createChannelConversationInput }, this.constructor.name);

      const { name, createdBy } = createChannelConversationInput;

      const conversationId = `${KeyPrefix.ChannelConversation}${this.idService.generateId()}`;

      const conversation: ChannelConversation = {
        id: conversationId,
        name,
        createdBy,
        conversationType: ConversationType.Channel,
      };

      await this.conversationRepository.createChannelConversation({ conversation });

      await this.addUserToConversation({ conversationId, userId: createdBy, role: Role.Admin });

      return { conversation };
    } catch (error: unknown) {
      this.loggerService.error("Error in createChannelConversation", { error, createChannelConversationInput }, this.constructor.name);

      throw error;
    }
  }

  public async addUserToConversation(addUserToConversationInput: AddUserToConversationInput): Promise<AddUserToConversationOutput> {
    try {
      this.loggerService.trace("addUserToConversation called", { addUserToConversationInput }, this.constructor.name);

      const { conversationId, userId, role } = addUserToConversationInput;

      const conversationUserRelationship: ConversationUserRelationship = {
        conversationId,
        userId,
        role,
        muted: false,
        updatedAt: new Date().toISOString(),
      };

      await this.conversationRepository.createConversationUserRelationship({ conversationUserRelationship });

      return { conversationUserRelationship };
    } catch (error: unknown) {
      this.loggerService.error("Error in addUserToConversation", { error, addUserToConversationInput }, this.constructor.name);

      throw error;
    }
  }

  public async removeUserFromConversation(removeUserFromConversationInput: RemoveUserFromConversationInput): Promise<RemoveUserFromConversationOutput> {
    try {
      this.loggerService.trace("removeUserFromConversation called", { removeUserFromConversationInput }, this.constructor.name);

      const { conversationId, userId } = removeUserFromConversationInput;

      await this.conversationRepository.deleteConversationUserRelationship({ conversationId, userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in removeUserFromConversation", { error, removeUserFromConversationInput }, this.constructor.name);

      throw error;
    }
  }

  public async getConversationsByUserId(getConversationsByUserIdInput: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput> {
    try {
      this.loggerService.trace("getConversationsByUserId called", { getConversationsByUserIdInput }, this.constructor.name);

      const { userId, exclusiveStartKey } = getConversationsByUserIdInput;

      const { conversations, lastEvaluatedKey } = await this.conversationRepository.getConversationsByUserId({ userId, exclusiveStartKey });

      return { conversations, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getConversationsByUserId", { error, getConversationsByUserIdInput }, this.constructor.name);

      throw error;
    }
  }

  public async isConversationMember(isConversationMemberInput: IsConversationMemberInput): Promise<IsConversationMemberOutput> {
    try {
      this.loggerService.trace("isConversationMember called", { isConversationMemberInput }, this.constructor.name);

      const { conversationId, userId } = isConversationMemberInput;

      await this.conversationRepository.getConversationUserRelationship({ conversationId, userId });

      return { isConversationMember: true };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isConversationMember: false };
      }

      this.loggerService.error("Error in isConversationMember", { error, isConversationMemberInput }, this.constructor.name);

      throw error;
    }
  }

  public async isConversationAdmin(isConversationAdminInput: IsConversationAdminInput): Promise<IsConversationAdminOutput> {
    try {
      this.loggerService.trace("isConversationAdmin called", { isConversationAdminInput }, this.constructor.name);

      const { conversationId, userId } = isConversationAdminInput;

      const { conversationUserRelationship } = await this.conversationRepository.getConversationUserRelationship({ conversationId, userId });

      const isConversationAdmin = conversationUserRelationship.role === Role.Admin;

      return { isConversationAdmin };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        return { isConversationAdmin: false };
      }

      this.loggerService.error("Error in isConversationAdmin", { error, isConversationAdminInput }, this.constructor.name);

      throw error;
    }
  }
}

export interface ConversationServiceInterface {
  createDmConversation(createDmConversationInput: CreateDmConversationInput): Promise<CreateDmConversationOutput>;
  createChannelConversation(createChannelConversationInput: CreateChannelConversationInput): Promise<CreateChannelConversationOutput>;
  addUserToConversation(addUserToConversationInput: AddUserToConversationInput): Promise<AddUserToConversationOutput>;
  removeUserFromConversation(removeUserFromConversationInput: RemoveUserFromConversationInput): Promise<RemoveUserFromConversationOutput>;
  getConversationsByUserId(getConversationsByUserIdInput: GetConversationsByUserIdInput): Promise<GetConversationsByUserIdOutput>;
  isConversationMember(isConversationMemberInput: IsConversationMemberInput): Promise<IsConversationMemberOutput>;
  isConversationAdmin(isConversationAdminInput: IsConversationAdminInput): Promise<IsConversationAdminOutput>;
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
}

export interface CreateChannelConversationOutput {
  conversation: ChannelConversation;
}

export interface AddUserToConversationInput {
  conversationId: string;
  userId: string;
  role: Role;
}

export interface AddUserToConversationOutput {
  conversationUserRelationship: ConversationUserRelationship;
}

export interface RemoveUserFromConversationInput {
  conversationId: string;
  userId: string;
}

export type RemoveUserFromConversationOutput = void;

export interface GetConversationsByUserIdInput {
  userId: string;
  exclusiveStartKey?: string;
}

export interface GetConversationsByUserIdOutput {
  conversations: WithRole<Conversation>[];
  lastEvaluatedKey?: string;
}

export interface IsConversationMemberInput {
  userId: string;
  conversationId: string;
}

export interface IsConversationMemberOutput {
  isConversationMember: boolean;
}

export interface IsConversationAdminInput {
  userId: string;
  conversationId: string;
}

export interface IsConversationAdminOutput {
  isConversationAdmin: boolean;
}
