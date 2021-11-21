import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, NotFoundError, UserId } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class UserDynamoRepository extends BaseDynamoRepositoryV2<User> implements UserRepositoryInterface {
  private gsiOneIndexName: string;

  private gsiTwoIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: UserRepositoryConfig,
  ) {
    super(documentClientFactory, config.tableNames.auth, loggerService);
    this.gsiOneIndexName = config.globalSecondaryIndexNames.one;
    this.gsiTwoIndexName = config.globalSecondaryIndexNames.two;
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
        ...(user.email && { gsi1pk: user.email, gsi1sk: EntityType.User }),
        ...(user.phone && { gsi2pk: user.phone, gsi2sk: EntityType.User }),
      };

      await this.documentClient.put({
        TableName: this.tableName,
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
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

      const { id } = params;

      const user = await this.get({ Key: { pk: id, sk: EntityType.User } }, "User");

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
          ":email": email,
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
          ":phone": phone,
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

  public async updateUser(params: UpdateUserInput): Promise<UpdateUserOutput> {
    try {
      this.loggerService.trace("updateUser called", { params }, this.constructor.name);

      const { id, updates } = params;

      const user = await this.partialUpdate(id, EntityType.User, updates);

      return { user };
    } catch (error: unknown) {
      this.loggerService.error("Error in updateUser", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async deleteUser(params: DeleteUserInput): Promise<DeleteUserOutput> {
    try {
      this.loggerService.trace("deleteUser called", { params }, this.constructor.name);

      const { id } = params;

      await this.documentClient.delete({
        TableName: this.tableName,
        Key: { pk: id, sk: EntityType.User },
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in deleteUser", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRepositoryInterface {
  createUser(params: CreateUserInput): Promise<CreateUserOutput>;
  getUser(params: GetUserInput): Promise<GetUserOutput>;
  getUserByEmail(params: GetUserByEmailInput): Promise<GetUserByEmailOutput>;
  getUserByPhone(params: GetUserByPhoneInput): Promise<GetUserByPhoneOutput>
  deleteUser(params: DeleteUserInput): Promise<DeleteUserOutput>;
}

type UserRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface User {
  id: UserId;
  email?: string;
  phone?: string;
  name?: string;
}

export interface RawUser extends User {
  entityType: EntityType.User;
  pk: UserId;
  sk: EntityType.User;
  // email
  gsi1pk?: string;
  gsi1sk?: EntityType.User;
  // phone
  gsi2pk?: string;
  gsi2sk?: EntityType.User;
}

export interface CreateUserInput {
  user: User;
}

export interface CreateUserOutput {
  user: User;
}

export interface UpdateUserInput {
  id: UserId;
  updates: Omit<User, "id">;
}

export interface UpdateUserOutput {
  user: User;
}

export interface GetUserInput {
  id: UserId;
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

export interface DeleteUserInput {
  id: string;
}

export type DeleteUserOutput = void;
