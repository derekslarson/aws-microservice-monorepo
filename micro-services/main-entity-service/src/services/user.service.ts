import { inject, injectable } from "inversify";
import { LoggerServiceInterface, WithRole } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { User } from "../models/user.model";

@injectable()
export class UserService implements UserServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
  ) {
  }

  public async createUser(createUserInput: CreateUserInput): Promise<CreateUserOutput> {
    try {
      this.loggerService.trace("createUser called", { createUserInput }, this.constructor.name);

      const {} = createUserInput;

      const user: User = {
        id: userCreationInput.id,
        email: userCreationInput.email,
      };

      const createdUser = await this.userRepository.createUser(user);

      return createdUser;
    } catch (error: unknown) {
      this.loggerService.error("Error in createUser", { error, createUserInput }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByTeamId(getUsersByTeamIdInput: GetUsersByTeamIdInput): Promise<GetUsersByTeamIdOutput> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { teamId }, this.constructor.name);

      const { users } = await this.userRepository.getUsersByTeamId(teamId);

      return users;
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, teamId }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByConversationId(getUsersByConversationIdInput: GetUsersByConversationIdInput): Promise<GetUsersByConversationIdOutput> {
    try {
      this.loggerService.trace("getUsersByConversationId called", { conversationId }, this.constructor.name);

      const { users } = await this.userRepository.getUsersByConversationId(conversationId);

      return users;
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByConversationId", { error, conversationId }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserServiceInterface {
  createUser(createUserInput: CreateUserInput): Promise<CreateUserOutput>;
  getUsersByTeamId(getUsersByTeamIdInput: GetUsersByTeamIdInput): Promise<GetUsersByTeamIdOutput>;
  getUsersByConversationId(getUsersByConversationIdInput: GetUsersByConversationIdInput): Promise<GetUsersByConversationIdOutput>;
}

export interface CreateUserInput {
  id: string;
  email: string;
}

export interface CreateUserOutput {
  user: User;
}

export interface GetUsersByTeamIdInput {
  teamId: string;
  exclusiveStartKey?: string;
}

export interface GetUsersByTeamIdOutput {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
}

export interface GetUsersByConversationIdInput {
  teamId: string;
  exclusiveStartKey?: string;
}

export interface GetUsersByConversationIdOutput {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
}
