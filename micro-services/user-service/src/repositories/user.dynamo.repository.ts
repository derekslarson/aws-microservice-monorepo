import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";

import { RawEntity } from "@yac/core/src/types/raw.entity.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { User } from "../models/user.model";

@injectable()
export class UserDynamoRepository extends BaseDynamoRepositoryV2<User> implements UserRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRepositoryConfigType,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, idService, loggerService);
  }

  public async createUser(user: User): Promise<User> {
    try {
      this.loggerService.trace("createUser called", { user }, this.constructor.name);

      const id = `USER-${user.id}`;

      const userEntity: RawEntity<User> = {
        type: "USER",
        pk: id,
        sk: id,
        id,
        email: user.email,
      };

      await this.documentClient.put({
        TableName: this.tableName,
        Item: userEntity,
      }).promise();

      return this.cleanse(userEntity);
    } catch (error: unknown) {
      this.loggerService.error("Error in createUser", { error, user }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRepositoryInterface {
  createUser(user: User): Promise<User>
}

type UserRepositoryConfigType = Pick<EnvConfigInterface, "tableNames">;
