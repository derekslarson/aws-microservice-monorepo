import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2 } from "@yac/util/src/repositories/base.dynamo.repository.v2";
import { DocumentClientFactory } from "@yac/util/src/factories/documentClient.factory";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserId } from "@yac/util/src/types/userId.type";
import { NotFoundError } from "@yac/util/src/errors/notFound.error";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { ImageMimeType } from "../enums/image.mimeType.enum";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class UserDynamoRepository extends BaseDynamoRepositoryV2<User> implements UserRepositoryInterface {
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
        entityType: EntityType.User,
        pk: user.id,
        sk: EntityType.User,
        ...user,
        ...(user.email && { gsi1pk: `${KeyPrefix.Email}${user.email}`, gsi1sk: EntityType.User }),
        ...(user.phone && { gsi2pk: `${KeyPrefix.Phone}${user.phone}`, gsi2sk: EntityType.User }),
        ...(user.username && { gsi3pk: `${KeyPrefix.Username}${user.username}`, gsi3sk: EntityType.User }),
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

      const user = await this.get({ Key: { pk: userId, sk: EntityType.User } }, "User");

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
          ":email": `${KeyPrefix.Email}${email}`,
          ":userEntityType": EntityType.User,
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
          ":phone": `${KeyPrefix.Phone}${phone}`,
          ":userEntityType": EntityType.User,
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
          ":username": `${KeyPrefix.Username}${username}`,
          ":userEntityType": EntityType.User,
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

      const user = await this.partialUpdate(userId, EntityType.User, updates);

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

      const users = await this.batchGet({ Keys: userIds.map((userId) => ({ pk: userId, sk: EntityType.User })) });

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

export interface UserRepositoryInterface {
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
  createdAt: string;
  email?: string;
  phone?: string;
  username?: string;
  name?: string;
  bio?: string;
}

export interface RawUser extends User {
  entityType: EntityType.User,
  pk: UserId;
  sk: EntityType.User;
  // email
  gsi1pk?: `${KeyPrefix.Email}${string}`;
  gsi1sk?: EntityType.User;
  // phone
  gsi2pk?: `${KeyPrefix.Phone}${string}`;
  gsi2sk?: EntityType.User;
  // username
  gsi3pk?: `${KeyPrefix.Username}${string}`;
  gsi3sk?: EntityType.User
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
