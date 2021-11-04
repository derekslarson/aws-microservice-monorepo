/* eslint-disable @typescript-eslint/naming-convention */
import { inject, injectable } from "inversify";
import { FileOperation, IdServiceInterface, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { UserRepositoryInterface, User as UserEntity, UserUpdates, RawUser } from "../repositories/user.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { UserId } from "../types/userId.type";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { SearchRepositoryInterface } from "../repositories/openSearch.repository";
import { SearchIndex } from "../enums/searchIndex.enum";
import { EntityType } from "../enums/entityType.enum";
import { ImageFileRepositoryInterface } from "../repositories/image.s3.repository";

@injectable()
export class UserService implements UserServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.IdServiceInterface) private idService: IdServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private userSearchRepository: UserSearchRepositoryInterface,
  ) {}

  public async createUser(params: CreateUserInput): Promise<CreateUserOutput> {
    try {
      this.loggerService.trace("createUser called", { params }, this.constructor.name);

      const { email, phone, username, realName, bio } = params;

      const userId: UserId = `${KeyPrefix.User}${this.idService.generateId()}`;

      const { image, mimeType: imageMimeType } = this.imageFileRepository.createDefaultImage();

      const userEntity: UserEntity = {
        id: userId,
        imageMimeType,
        email,
        phone,
        username,
        realName,
        bio,
      };

      await Promise.all([
        this.imageFileRepository.uploadFile({ entityType: EntityType.User, entityId: userId, file: image, mimeType: imageMimeType }),
        this.userRepository.createUser({ user: userEntity }),
      ]);

      const { entity: user } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.User, entity: userEntity });

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in createUser", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async updateUserByUserId(params: UpdateUserByUserIdInput): Promise<UpdateUserByUserIdOutput> {
    try {
      this.loggerService.trace("updateUserByUserId called", { params }, this.constructor.name);

      const { userId, realName, bio } = params;

      await this.userRepository.updateUser({ userId, updates: { realName, bio } });

      return;
    } catch (error: unknown) {
      this.loggerService.error("Error in getUser", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUser(params: GetUserInput): Promise<GetUserOutput> {
    try {
      this.loggerService.trace("getUser called", { params }, this.constructor.name);

      const { userId } = params;

      const { user: userEntity } = await this.userRepository.getUser({ userId });

      const { entity: user } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.User, entity: userEntity });

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

      const { user: userEntity } = await this.userRepository.updateUser({ userId, updates });

      const { entity: user } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.User, entity: userEntity });

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

      const { users: userEntities } = await this.userRepository.getUsers({ userIds });

      const userMap: Record<string, User> = {};
      userEntities.forEach((userEntity) => {
        const { entity: userWithImage } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.User, entity: userEntity });
        userMap[userEntity.id] = userWithImage;
      });

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

      const { user: rawUser } = params;

      const { user } = this.userRepository.convertRawUserToUser({ rawUser });

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

      const { users: userEntities, lastEvaluatedKey } = await this.userSearchRepository.getUsersBySearchTerm({ searchTerm, userIds, limit, exclusiveStartKey });

      const searchUserIds = userEntities.map((user) => user.id);

      const { users } = await this.getUsers({ userIds: searchUserIds });

      return { users, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersBySearchTerm", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public getUserImageUploadUrl(params: GetUserImageUploadUrlInput): GetUserImageUploadUrlOutput {
    try {
      this.loggerService.trace("getUserImageUploadUrl called", { params }, this.constructor.name);

      const { userId, mimeType } = params;

      const { signedUrl: uploadUrl } = this.imageFileRepository.getSignedUrl({
        operation: FileOperation.Upload,
        entityType: EntityType.User,
        entityId: userId,
        mimeType,
      });

      return { uploadUrl };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserImageUploadUrl", { error, params }, this.constructor.name);

      throw error;
    }
  }
}
export interface User extends Omit<UserEntity, "imageMimeType"> {
  image: string;
}

export interface UserServiceInterface {
  createUser(params: CreateUserInput): Promise<CreateUserOutput>;
  updateUserByUserId(params: UpdateUserByUserIdInput): Promise<UpdateUserByUserIdOutput>;
  getUser(params: GetUserInput): Promise<GetUserOutput>;
  updateUser(params: UpdateUserInput): Promise<UpdateUserOutput>;
  getUsers(params: GetUsersInput): Promise<GetUsersOutput>;
  getUserImageUploadUrl(params: GetUserImageUploadUrlInput): GetUserImageUploadUrlOutput;
  indexUserForSearch(params: IndexUserForSearchInput): Promise<IndexUserForSearchOutput>;
  deindexUserForSearch(params: DeindexUserForSearchInput): Promise<DeindexUserForSearchOutput>;
  getUsersBySearchTerm(params: GetUsersBySearchTermInput): Promise<GetUsersBySearchTermOutput>;
}

interface BaseCreateUserInput {
  email?: string;
  phone?: string;
  username?: string;
  realName?: string;
  bio?: string;
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

export type UpdateUserByUserIdInput = Pick<BaseCreateUserInput, "realName" | "bio"> & {
  userId: UserId;
};

export type UpdateUserByUserIdOutput = void;

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

export interface GetUserImageUploadUrlInput {
  userId: UserId;
  mimeType: ImageMimeType;
}

export interface GetUserImageUploadUrlOutput {
  uploadUrl: string;
}

type UserSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getUsersBySearchTerm">;
