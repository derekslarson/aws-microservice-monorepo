import { inject, injectable } from "inversify";
import { IdServiceInterface, LoggerServiceInterface } from "@yac/util";

import { TYPES } from "../inversion-of-control/types";
import { UserRepositoryInterface, User as UserEntity, UserUpdates, RawUser } from "../repositories/user.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { UserId } from "../types/userId.type";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { SearchRepositoryInterface } from "../repositories/openSearch.repository";
import { SearchIndex } from "../enums/searchIndex.enum";

@injectable()
export class UserService implements UserServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private userSearchRepository: UserSearchRepositoryInterface,
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

  public async updateUser(params: UpdateUserInput): Promise<UpdateUserOutput> {
    try {
      this.loggerService.trace("updateUser called", { params }, this.constructor.name);

      const { userId, updates } = params;

      const { user } = await this.userRepository.updateUser({ userId, updates });

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateUser", { error, params }, this.constructor.name);

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

  public async indexUserForSearch(params: IndexUserForSearchInput): Promise<IndexUserForSearchOutput> {
    try {
      this.loggerService.trace("indexUserForSearch called", { params }, this.constructor.name);

      const { user } = params;

      await this.userSearchRepository.indexDocument({ index: SearchIndex.User, document: user });
    } catch (error: unknown) {
      this.loggerService.error("Error in indexUserForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deindexUserForSearch(params: DeindexUserForSearchInput): Promise<DeindexUserForSearchOutput> {
    try {
      this.loggerService.trace("deindexUserForSearch called", { params }, this.constructor.name);

      const { userId } = params;

      await this.userSearchRepository.deindexDocument({ index: SearchIndex.User, id: userId });
    } catch (error: unknown) {
      this.loggerService.error("Error in deindexUserForSearch", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersBySearchTerm(params: GetUsersBySearchTermInput): Promise<GetUsersBySearchTermOutput> {
    try {
      this.loggerService.trace("getUsersBySearchTerm called", { params }, this.constructor.name);

      const { searchTerm, userIds, limit, exclusiveStartKey } = params;

      const { users, lastEvaluatedKey } = await this.userSearchRepository.getUsersBySearchTerm({ searchTerm, userIds, limit, exclusiveStartKey });

      return { users, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export type User = UserEntity;

export interface UserServiceInterface {
  createUser(params: CreateUserInput): Promise<CreateUserOutput>;
  getUser(params: GetUserInput): Promise<GetUserOutput>;
  updateUser(params: UpdateUserInput): Promise<UpdateUserOutput>;
  getUsers(params: GetUsersInput): Promise<GetUsersOutput>;
  indexUserForSearch(params: IndexUserForSearchInput): Promise<IndexUserForSearchOutput>;
  deindexUserForSearch(params: DeindexUserForSearchInput): Promise<DeindexUserForSearchOutput>;
  getUsersBySearchTerm(params: GetUsersBySearchTermInput): Promise<GetUsersBySearchTermOutput>;
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

export interface UpdateUserInput {
  userId: UserId;
  updates: UserUpdates;
}

export interface UpdateUserOutput {
  user: User;
}

export interface GetUsersInput {
  userIds: UserId[];
}

export interface GetUsersOutput {
  users: User[];
}

export interface IndexUserForSearchInput {
  user: RawUser;
}

export type IndexUserForSearchOutput = void;

export interface DeindexUserForSearchInput {
  userId: UserId;
}

export type DeindexUserForSearchOutput = void;

export interface GetUsersBySearchTermInput {
  searchTerm: string;
  userIds?: UserId[];
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetUsersBySearchTermOutput {
  users: User[];
  lastEvaluatedKey?: string;
}

type UserSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getUsersBySearchTerm">;
