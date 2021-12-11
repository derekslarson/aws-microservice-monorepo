import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, NotFoundError } from "@yac/util";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { KeyPrefixV2 } from "../enums/keyPrefixV2.enum";
import { EntityTypeV2 } from "../enums/entityTypeV2.enum";

@injectable()
export class UserDynamoRepositoryV2 extends BaseDynamoRepositoryV2<User> implements UserRepositoryV2Interface {
  private gsiOneIndexName: string;

  private gsiTwoIndexName: string;

  private gsiThreeIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRepositoryConfig,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
    this.gsiTwoIndexName = envConfig.globalSecondaryIndexNames.two;
    this.gsiThreeIndexName = envConfig.globalSecondaryIndexNames.three;
  }

  public async createUser(params: CreateUserInput): Promise<CreateUserOutput> {
    try {
      this.loggerService.trace("createUser called", { params }, this.constructor.name);

      const { user } = params;

      const userEntity: RawUser = {
        entityType: EntityTypeV2.User,
        pk: user.id,
        sk: EntityTypeV2.User,
        ...user,
        ...(user.email && { gsi1pk: `${KeyPrefixV2.Email}${user.email}`, gsi1sk: EntityTypeV2.User }),
        ...(user.phone && { gsi2pk: `${KeyPrefixV2.Phone}${user.phone}`, gsi2sk: EntityTypeV2.User }),
        ...(user.username && { gsi3pk: `${KeyPrefixV2.Username}${user.username}`, gsi3sk: EntityTypeV2.User }),
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk)",
        Item: userEntity,
      }).promise();

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

      const user = await this.get({ Key: { pk: userId, sk: EntityTypeV2.User } }, "User");

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

      const { Items: [ user ] } = await this.query({
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :email AND #gsi1sk = :userEntityType",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":email": `${KeyPrefixV2.Email}${email}`,
          ":userEntityType": EntityTypeV2.User,
        },
      });

      if (!user) {
        throw new NotFoundError("User not found.");
      }

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

      const { Items: [ user ] } = await this.query({
        IndexName: this.gsiTwoIndexName,
        KeyConditionExpression: "#gsi2pk = :phone AND #gsi2sk = :userEntityType",
        ExpressionAttributeNames: {
          "#gsi2pk": "gsi2pk",
          "#gsi2sk": "gsi2sk",
        },
        ExpressionAttributeValues: {
          ":phone": `${KeyPrefixV2.Phone}${phone}`,
          ":userEntityType": EntityTypeV2.User,
        },
      });

      if (!user) {
        throw new NotFoundError("User not found.");
      }

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

      const { Items: [ user ] } = await this.query({
        IndexName: this.gsiThreeIndexName,
        KeyConditionExpression: "#gsi3pk = :username AND #gsi3sk = :userEntityType",
        ExpressionAttributeNames: {
          "#gsi3pk": "gsi3pk",
          "#gsi3sk": "gsi3sk",
        },
        ExpressionAttributeValues: {
          ":username": `${KeyPrefixV2.Username}${username}`,
          ":userEntityType": EntityTypeV2.User,
        },
      });

      if (!user) {
        throw new NotFoundError("User not found.");
      }

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

      const user = await this.partialUpdate(userId, EntityTypeV2.User, updates);

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

      const users = await this.batchGet({ Keys: userIds.map((userId) => ({ pk: userId, sk: EntityTypeV2.User })) });

      return { users };
    } catch (error: unknown) {
      this.loggerService.error("Error in getUsers", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public convertRawUserToUser(params: ConvertRawUserToUserInput): ConvertRawUserToUserOutput {
    try {
      this.loggerService.trace("convertRawUserToUser called", { params }, this.constructor.name);

      const { rawUser } = params;

      const user = this.cleanse(rawUser);

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in convertRawUserToUser", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRepositoryV2Interface {
  createUser(params: CreateUserInput): Promise<CreateUserOutput>;
  getUser(params: GetUserInput): Promise<GetUserOutput>;
  getUserByEmail(params: GetUserByEmailInput): Promise<GetUserByEmailOutput>;
  getUserByPhone(params: GetUserByPhoneInput): Promise<GetUserByPhoneOutput>;
  getUserByUsername(params: GetUserByUsernameInput): Promise<GetUserByUsernameOutput>;
  updateUser(params: UpdateUserInput): Promise<UpdateUserOutput>;
  getUsers(params: GetUsersInput): Promise<GetUsersOutput>;
  convertRawUserToUser(params: ConvertRawUserToUserInput): ConvertRawUserToUserOutput;
}

type UserRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface User {
  id: UserId;
  imageMimeType: ImageMimeType;
  email?: string;
  phone?: string;
  username?: string;
  name?: string;
  bio?: string;
}

export interface RawUser extends User {
  entityType: EntityTypeV2.User,
  pk: UserId;
  sk: EntityTypeV2.User;
  // email
  gsi1pk?: `${KeyPrefixV2.Email}${string}`;
  gsi1sk?: EntityTypeV2.User;
  // phone
  gsi2pk?: `${KeyPrefixV2.Phone}${string}`;
  gsi2sk?: EntityTypeV2.User;
  // username
  gsi3pk?: `${KeyPrefixV2.Username}${string}`;
  gsi3sk?: EntityTypeV2.User
}

export interface CreateUserInput {
  user: User;
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

export type UserUpdates = Partial<Pick<User, "name" | "imageMimeType" | "bio">>;

export interface UpdateUserInput {
  userId: UserId;
  updates: UserUpdates;
}

export interface UpdateUserOutput {
  user: User;
}

export interface GetUsersInput {
  userIds: string[];
}

export interface GetUsersOutput {
  users: User[];
}

export interface ConvertRawUserToUserInput {
  rawUser: RawUser;

}

export interface ConvertRawUserToUserOutput {
  user: User;
}

export type UserId = `${KeyPrefixV2.User}${string}`;
