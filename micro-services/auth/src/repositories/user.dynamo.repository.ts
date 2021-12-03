import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, DocumentClientFactory, LoggerServiceInterface, TransactItemType, TransactWriteInput, UserId } from "@yac/util";
import { Failcode, ValidationError } from "runtypes";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { EntityType } from "../enums/entityType.enum";

@injectable()
export class UserDynamoRepository extends BaseDynamoRepositoryV2<User> implements UserRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: UserRepositoryConfig,
  ) {
    super(documentClientFactory, config.tableNames.auth, loggerService);
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
      };

      const transactWriteInput: TransactWriteInput = {
        TransactItems: [
          {
            id: "user",
            type: TransactItemType.Put,
            ConditionExpression: "attribute_not_exists(pk)",
            Item: userEntity,
          },
        ],
      };

      if (user.username) {
        const uniqueUsernameEntity: RawUniqueUsername = {
          entityType: EntityType.UserUniqueUsername,
          pk: user.username,
          sk: EntityType.UserUniqueUsername,
          userId: user.id,
          username: user.username,
        };

        transactWriteInput.TransactItems.push({
          id: "username",
          type: TransactItemType.Put,
          ConditionExpression: "attribute_not_exists(pk)",
          Item: uniqueUsernameEntity,
        });
      }

      if (user.email) {
        const uniqueEmailEntity: RawUniqueEmail = {
          entityType: EntityType.UserUniqueEmail,
          pk: user.email,
          sk: EntityType.UserUniqueEmail,
          userId: user.id,
          email: user.email,
        };

        transactWriteInput.TransactItems.push({
          id: "email",
          type: TransactItemType.Put,
          ConditionExpression: "attribute_not_exists(pk)",
          Item: uniqueEmailEntity,
        });
      }

      if (user.phone) {
        const uniquePhoneEntity: RawUniquePhone = {
          entityType: EntityType.UserUniquePhone,
          pk: user.phone,
          sk: EntityType.UserUniquePhone,
          userId: user.id,
          phone: user.phone,
        };

        transactWriteInput.TransactItems.push({
          id: "phone",
          type: TransactItemType.Put,
          ConditionExpression: "attribute_not_exists(pk)",
          Item: uniquePhoneEntity,
        });
      }

      const transactWriteOutput = await this.transactWrite(transactWriteInput);

      if (transactWriteOutput.success) {
        return { user };
      }

      const failureIdsWithoutUser = transactWriteOutput.failureIds.filter((id) => id !== "user");
      const validationErrorBody = failureIdsWithoutUser.reduce((acc, val) => ({ ...acc, [val]: "Not unique." }), {});

      throw new ValidationError({
        success: false,
        code: Failcode.VALUE_INCORRECT,
        message: "Error validating body.",
        details: { body: validationErrorBody },
      });
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

      const uniqueEmailEntity = await this.get<UniqueEmail>({ Key: { pk: email, sk: EntityType.UserUniqueEmail } }, "User");

      const user = await this.get({ Key: { pk: uniqueEmailEntity.userId, sk: EntityType.User } }, "User");

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

      const uniquePhoneEntity = await this.get<UniquePhone>({ Key: { pk: phone, sk: EntityType.UserUniquePhone } }, "User");

      const user = await this.get({ Key: { pk: uniquePhoneEntity.userId, sk: EntityType.User } }, "User");

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
  getUserByPhone(params: GetUserByPhoneInput): Promise<GetUserByPhoneOutput>;
  deleteUser(params: DeleteUserInput): Promise<DeleteUserOutput>;
}

type UserRepositoryConfig = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;

export interface User {
  id: UserId;
  createdAt: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
}
export interface RawUser extends User {
  entityType: EntityType.User;
  pk: UserId;
  sk: EntityType.User;
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

interface UniqueEmail {
  userId: UserId;
  email: string;
}

interface RawUniqueEmail extends UniqueEmail {
  // email
  pk: string;
  sk: EntityType.UserUniqueEmail;
  entityType: EntityType.UserUniqueEmail;
}

interface UniquePhone {
  userId: UserId;
  phone: string;
}

interface RawUniquePhone extends UniquePhone {
  // phone
  pk: string;
  sk: EntityType.UserUniquePhone;
  entityType: EntityType.UserUniquePhone;
}

interface UniqueUsername {
  userId: UserId;
  username: string;
}

interface RawUniqueUsername extends UniqueUsername {
  // username
  pk: string;
  sk: EntityType.UserUniqueUsername;
  entityType: EntityType.UserUniqueUsername;
}
