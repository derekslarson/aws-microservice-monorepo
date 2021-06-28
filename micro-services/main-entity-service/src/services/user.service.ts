import { inject, injectable } from "inversify";
import { LoggerServiceInterface, User } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { UserCreationInput } from "../models/user.creation.input.model";

@injectable()
export class UserService implements UserServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
  ) {
  }

  public async createUser(userCreationInput: UserCreationInput): Promise<User> {
    try {
      this.loggerService.trace("createUser called", { userCreationInput }, this.constructor.name);

      const user: User = {
        id: userCreationInput.id,
        email: userCreationInput.email,
      };

      const createdUser = await this.userRepository.createUser(user);

      return createdUser;
    } catch (error: unknown) {
      this.loggerService.error("Error in createUser", { error, userCreationInput }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByTeamId(teamId: string): Promise<User[]> {
    try {
      this.loggerService.trace("getUsersByTeamId called", { teamId }, this.constructor.name);

      const users = await this.userRepository.getUsersByTeamId(teamId);

      return users;
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByTeamId", { error, teamId }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByConversationId(teamId: string): Promise<User[]> {
    try {
      this.loggerService.trace("getUsersByConversationId called", { teamId }, this.constructor.name);

      const users = await this.userRepository.getUsersByConversationId(teamId);

      return users;
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByConversationId", { error, teamId }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserServiceInterface {
  createUser(userCreationInput: UserCreationInput): Promise<User>;
  getUsersByTeamId(teamId: string): Promise<User[]>;
  getUsersByConversationId(teamId: string): Promise<User[]>;
}
