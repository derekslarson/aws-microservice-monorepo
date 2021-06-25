import { inject, injectable } from "inversify";
import { LoggerServiceInterface, TeamUserRelationship, User } from "@yac/core";
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

  public async getTeamsByUserId(userId: string): Promise<Omit<TeamUserRelationship, "userId">[]> {
    try {
      this.loggerService.trace("getTeamsByUserId called", { userId }, this.constructor.name);

      const teamUserRelationships = await this.userRepository.getTeamUserRelationshipsByUserId(userId);

      return teamUserRelationships.map(({ teamId, role }) => ({ teamId, role }));
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamsByUserId", { error, userId }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserServiceInterface {
  createUser(userCreationInput: UserCreationInput): Promise<User>;
  getTeamsByUserId(userId: string): Promise<Omit<TeamUserRelationship, "userId">[]>;
}
