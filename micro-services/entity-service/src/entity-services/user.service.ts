import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface } from "@yac/core";

import { TYPES } from "../inversion-of-control/types";
import { UserRepositoryInterface, User as UserEntity } from "../repositories/user.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { UserId } from "../types/userId.type";
import { ImageMimeType } from "../enums/image.mimeType.enum";

@injectable()
export class UserService implements UserServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
  ) {}

  public async createUser(params: CreateUserInput): Promise<CreateUserOutput> {
    try {
      this.loggerService.trace("createUser called", { params }, this.constructor.name);

      const { email, phone, username, realName, imageMimeType } = params;

      const userId: UserId = `${KeyPrefix.User}${this.idService.generateId()}`;

      const user: UserEntity = {
        id: userId,
        imageMimeType,
        email,
        phone,
        username,
        realName,
      };

      await this.userRepository.createUser({ user });

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

      const { user } = await this.userRepository.getUser({ userId });

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

      const { users } = await this.userRepository.getUsers({ userIds });

      const userMap = users.reduce((acc: { [key: string]: User; }, user) => {
        acc[user.id] = user;

        return acc;
      }, {});

      const sortedUsers = userIds.map((userId) => userMap[userId]);

      return { users: sortedUsers };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsers", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export type User = UserEntity;

export interface UserServiceInterface {
  createUser(params: CreateUserInput): Promise<CreateUserOutput>;
  getUser(params: GetUserInput): Promise<GetUserOutput>;
  getUsers(params: GetUsersInput): Promise<GetUsersOutput>;
}

interface BaseCreateUserInput {
  imageMimeType: ImageMimeType;
  email?: string;
  phone?: string;
  username?: string;
  realName?: string;
}
interface CreateUserEmailRequiredInput extends Omit<BaseCreateUserInput, "email"> {
  email: string;
}

interface CreateUserPhoneRequiredInput extends Omit<BaseCreateUserInput, "phone"> {
  phone: string;
}

export type CreateUserInput = CreateUserEmailRequiredInput | CreateUserPhoneRequiredInput;

export interface CreateUserOutput {
  user: User;
}

export interface GetUserInput {
  userId: UserId;
}

export interface GetUserOutput {
  user: User;
}

export interface GetUsersInput {
  userIds: UserId[];
}

export interface GetUsersOutput {
  users: User[];
}
