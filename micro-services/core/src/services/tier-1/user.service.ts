import { inject, injectable } from "inversify";
import { LoggerServiceInterface, UserId, FileOperation, WithRole } from "@yac/util";
import { RawUser as RawUserEntity, User as UserEntity, UserRepositoryInterface, UserUpdates } from "../../repositories/user.dynamo.repository";
import { ImageFileRepositoryInterface } from "../../repositories/image.s3.repository";
import { TYPES } from "../../inversion-of-control/types";
import { EntityType } from "../../enums/entityType.enum";
import { SearchRepositoryInterface } from "../../repositories/openSearch.repository";
import { ImageMimeType } from "../../enums/image.mimeType.enum";
import { SearchIndex } from "../../enums/searchIndex.enum";
import { EntityId, MembershipRepositoryInterface } from "../../repositories/membership.dynamo.repository";

@injectable()
export class UserService implements UserServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ImageFileRepositoryInterface) private imageFileRepository: ImageFileRepositoryInterface,
    @inject(TYPES.UserRepositoryInterface) private userRepository: UserRepositoryInterface,
    @inject(TYPES.SearchRepositoryInterface) private userSearchRepository: UserSearchRepositoryInterface,
    @inject(TYPES.MembershipRepositoryInterface) private membershipRepository: MembershipRepositoryInterface,
  ) {}

  public async createUser(params: CreateUserInput): Promise<CreateUserOutput> {
    try {
      this.loggerService.trace("createUser called", { params }, this.constructor.name);

      const { id, email, phone, username, name, bio } = params;

      const { image, mimeType: imageMimeType } = this.imageFileRepository.createDefaultImage();

      const now = new Date().toISOString();

      const userEntity: UserEntity = {
        id,
        imageMimeType,
        createdAt: now,
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

  public async updateUser(params: UpdateUserInput): Promise<UpdateUserOutput> {
    try {
      this.loggerService.trace("updateUser called", { params }, this.constructor.name);

      const { userId, updates } = params;

      await this.userRepository.updateUser({ userId, updates });
    } catch (error: unknown) {
      this.loggerService.error("Error in updateUser", { error, params }, this.constructor.name);

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

  public async getUsers(params: GetUsersInput): Promise<GetUsersOutput> {
    try {
      this.loggerService.trace("getUsers called", { params }, this.constructor.name);

      const { userIds } = params;

      const { users } = await this.userRepository.getUsers({ userIds });

      const userMap: Record<string, User> = {};
      users.forEach((userEntity) => {
        const { entity: user } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.User, entity: userEntity });

        userMap[user.id] = user;
      });

      const sortedUsers = userIds.map((userId) => userMap[userId]);

      return { users: sortedUsers };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsers", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async getUsersByEntityId(params: GetUsersByEntityIdInput): Promise<GetUsersByEntityIdOutput> {
    try {
      this.loggerService.trace("getUsersByEntityId called", { params }, this.constructor.name);

      const { entityId, exclusiveStartKey, limit } = params;

      const { memberships, lastEvaluatedKey } = await this.membershipRepository.getMembershipsByEntityId({
        entityId,
        exclusiveStartKey,
        limit,
      });

      const userIds = memberships.map((membership) => membership.userId);

      const { users: userEntities } = await this.userRepository.getUsers({ userIds });

      const users = userEntities.map((userEntity, i) => {
        const { entity: user } = this.imageFileRepository.replaceImageMimeTypeForImage({ entityType: EntityType.User, entity: userEntity });

        const userWithRole: WithRole<User> = {
          ...user,
          role: memberships[i].role,
        };

        return userWithRole;
      });

      return { users, lastEvaluatedKey };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsersByEntityId", { error, params }, this.constructor.name);

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
}

export interface UserServiceInterface {
  createUser(params: CreateUserInput): Promise<CreateUserOutput>;
  updateUser(params: UpdateUserInput): Promise<UpdateUserOutput>;
  getUser(params: GetUserInput): Promise<GetUserOutput>;
  getUserByEmail(params: GetUserByEmailInput): Promise<GetUserByEmailOutput>;
  getUserByPhone(params: GetUserByPhoneInput): Promise<GetUserByPhoneOutput>;
  getUserByUsername(params: GetUserByUsernameInput): Promise<GetUserByUsernameOutput>;
  getUsers(params: GetUsersInput): Promise<GetUsersOutput>;
  getUsersByEntityId(params: GetUsersByEntityIdInput): Promise<GetUsersByEntityIdOutput>
  getUsersBySearchTerm(params: GetUsersBySearchTermInput): Promise<GetUsersBySearchTermOutput>;
  getUserImageUploadUrl(params: GetUserImageUploadUrlInput): GetUserImageUploadUrlOutput;
  indexUserForSearch(params: IndexUserForSearchInput): Promise<IndexUserForSearchOutput>;
  deindexUserForSearch(params: DeindexUserForSearchInput): Promise<DeindexUserForSearchOutput>;
}

export type User = Omit<UserEntity, "imageMimeType"> & {
  image: string;
};

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

export interface UpdateUserInput {
  userId: UserId;
  updates: UserUpdates;
}

export type UpdateUserOutput = void;

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

export interface GetUsersInput {
  userIds: UserId[];
}

export interface GetUsersOutput {
  users: User[];
}

export interface GetUsersByEntityIdInput {
  entityId: EntityId;
  limit?: number;
  exclusiveStartKey?: string;
}

export interface GetUsersByEntityIdOutput {
  users: WithRole<User>[];
  lastEvaluatedKey?: string;
}

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

export interface IndexUserForSearchInput {
  user: RawUserEntity;
}

export type IndexUserForSearchOutput = void;

export interface DeindexUserForSearchInput {
  userId: UserId;
}

export type DeindexUserForSearchOutput = void;

type UserSearchRepositoryInterface = Pick<SearchRepositoryInterface, "indexDocument" | "deindexDocument" | "getUsersBySearchTerm">;
