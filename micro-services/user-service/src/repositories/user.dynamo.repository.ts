import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepository, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface } from "@yac/core";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { User } from "../models/user.model";

@injectable()
export class UserDynamoRepository extends BaseDynamoRepository<User> implements UserRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRepositoryConfigType,
  ) {
    super(envConfig.tableNames.users, documentClientFactory, idService, loggerService);
  }

  public async createUser(user: User): Promise<User> {
    try {
      this.loggerService.trace("createUser called", { user }, this.constructor.name);

      const createdUser = await this.insertWithIdIncluded(user);

      return createdUser;
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
