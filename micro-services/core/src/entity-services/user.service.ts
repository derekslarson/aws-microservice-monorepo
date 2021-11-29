/* eslint-disable @typescript-eslint/naming-convention */
import { inject, injectable } from "inversify";
import { FileOperation, LoggerServiceInterface, UserId } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { UserRepositoryInterface, User as UserEntity, UserUpdates, RawUser } from "../repositories/user.dynamo.repository";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { SearchRepositoryInterface } from "../repositories/openSearch.repository";
import { SearchIndex } from "../enums/searchIndex.enum";
import { EntityType } from "../enums/entityType.enum";
import { ImageFileRepositoryInterface } from "../repositories/image.s3.repository";

@injectable()
export class UserService implements UserServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private userSearchRepository: UserSearchRepositoryInterface,
  ) {}

  public async createUser(params: CreateUserInput): Promise<CreateUserOutput> {
    try {
      this.loggerService.trace("createUser called", { params }, this.constructor.name);

      const { id, email, phone, username, name, bio } = params;

      const { image, mimeType: imageMimeType } = this.imageFileRepository.createDefaultImage();

      const userEntity: UserEntity = {
        id,
        imageMimeType,
        email,
        phone,
        username,
        name,
        bio,
      };

      await Promise.all([
        this.imageFileRepository.uploadFile({ entityType: EntityType.User, entityId: id, file: image, mimeType: imageMimeType }),
        this.userRepository.createUser({ user: userEntity }),
      ]);

      const { entity: user } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.User, entity: userEntity });

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

      const { user: userEntity } = await this.userRepository.getUser({ userId });

      const { entity: user } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.User, entity: userEntity });

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUser", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUserByEmail(params: GetUserByEmailInput): Promise<GetUserByEmailOutput> {
    try {
      this.loggerService.trace("getUserByEmail called", { params }, this.constructor.name);

      const { email } = params;

      const { user: userEntity } = await this.userRepository.getUserByEmail({ email });

      const { entity: user } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.User, entity: userEntity });

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserByEmail", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUserByPhone(params: GetUserByPhoneInput): Promise<GetUserByPhoneOutput> {
    try {
      this.loggerService.trace("getUserByPhone called", { params }, this.constructor.name);

      const { phone } = params;

      const { user: userEntity } = await this.userRepository.getUserByPhone({ phone });

      const { entity: user } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.User, entity: userEntity });

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserByPhone", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUserByUsername(params: GetUserByUsernameInput): Promise<GetUserByUsernameOutput> {
    try {
      this.loggerService.trace("getUserByUsername called", { params }, this.constructor.name);

      const { username } = params;

      const { user: userEntity } = await this.userRepository.getUserByUsername({ username });

      const { entity: user } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.User, entity: userEntity });

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUserByUsername", { error, params }, this.constructor.name);

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
  getUser(params: GetUserInput): Promise<GetUserOutput>;
  getUserByEmail(params: GetUserByEmailInput): Promise<GetUserByEmailOutput>;
  getUserByPhone(params: GetUserByPhoneInput): Promise<GetUserByPhoneOutput>;
  getUserByUsername(params: GetUserByUsernameInput): Promise<GetUserByUsernameOutput>;
  updateUser(params: UpdateUserInput): Promise<UpdateUserOutput>;
  getUsers(params: GetUsersInput): Promise<GetUsersOutput>;
  getUserImageUploadUrl(params: GetUserImageUploadUrlInput): GetUserImageUploadUrlOutput;
  indexUserForSearch(params: IndexUserForSearchInput): Promise<IndexUserForSearchOutput>;
  deindexUserForSearch(params: DeindexUserForSearchInput): Promise<DeindexUserForSearchOutput>;
  getUsersBySearchTerm(params: GetUsersBySearchTermInput): Promise<GetUsersBySearchTermOutput>;
}

export interface CreateUserInput {
  id: UserId;
  email?: string;
  phone?: string;
  username?: string;
  name?: string;
  bio?: string;
}

export interface CreateUserOutput {
  user: User;
}

export interface GetUserInput {
  userId: UserId;
}

export interface GetUserOutput {
  user: User;
}

export interface GetUserByEmailInput {
  email: string;
}

export interface GetUserByEmailOutput {
  user: User;
}

export interface GetUserByPhoneInput {
  phone: string;
}

export interface GetUserByPhoneOutput {
  user: User;
}

export interface GetUserByUsernameInput {
  username: string;
}

export interface GetUserByUsernameOutput {
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
