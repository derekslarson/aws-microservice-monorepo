import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepositoryV2, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface, User, TeamUserRelationship } from "@yac/core";

import { RawEntity } from "@yac/core/src/types/raw.entity.type";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserDynamoRepository extends BaseDynamoRepositoryV2<User> implements UserRepositoryInterface {
  private gsiOneIndexName: string;

  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRepositoryConfigType,
  ) {
    super(documentClientFactory, envConfig.tableNames.core, idService, loggerService);

    this.gsiOneIndexName = envConfig.globalSecondaryIndexNames.one;
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

  public async getTeamUserRelationshipsByUserId(userId: string): Promise<TeamUserRelationship[]> {
    try {
      this.loggerService.trace("getTeamUserRelationshipsByUserId called", { userId }, this.constructor.name);

      const { Items: teamUserRelationships } = await this.query<TeamUserRelationship>({
        TableName: this.tableName,
        IndexName: this.gsiOneIndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND begins_with(#gsi1sk, :team)",
        ExpressionAttributeNames: {
          "#gsi1pk": "gsi1pk",
          "#gsi1sk": "gsi1sk",
        },
        ExpressionAttributeValues: {
          ":gsi1pk": userId,
          ":team": "TEAM-",
        },
      });

      return teamUserRelationships;
    } catch (error: unknown) {
      this.loggerService.error("Error in getTeamUserRelationshipsByUserId", { error, userId }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRepositoryInterface {
  createUser(user: User): Promise<User>;
  getTeamUserRelationshipsByUserId(userId: string): Promise<TeamUserRelationship[]>
}

type UserRepositoryConfigType = Pick<EnvConfigInterface, "tableNames" | "globalSecondaryIndexNames">;
