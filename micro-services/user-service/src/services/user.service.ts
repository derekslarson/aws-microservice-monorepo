import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { UserCreationInput } from "../models/user.creation.input.model";
import { User } from "../models/user.model";

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
}

export interface UserServiceInterface {
  createUser(userCreationInput: UserCreationInput): Promise<User>;
}
