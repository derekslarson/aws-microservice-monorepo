import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserRemovedAsFriendSnsServiceInterface } from "../sns-services/userRemovedAsFriend.sns.service";
import { RawOneOnOne } from "../repositories/oneOnOne.dynamo.repository";
import { UserServiceInterface } from "../services/tier-1/user.service";

@injectable()
export class OneOnOneDeletedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserRemovedAsFriendSnsServiceInterface) private userRemovedAsFriendSnsService: UserRemovedAsFriendSnsServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedAsFriendDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isOneOnOne = record.oldImage.entityType === EntityType.OneOnOne;
      const isDeletion = record.eventName === "REMOVE";

      return isCoreTable && isOneOnOne && isDeletion;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawOneOnOne>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { oldImage: { createdBy, otherUserId } } = record;

      const [ { user: userA }, { user: userB } ] = await Promise.all([
        this.userService.getUser({ userId: createdBy }),
        this.userService.getUser({ userId: otherUserId }),
      ]);

      await this.userRemovedAsFriendSnsService.sendMessage({
        userA,
        userB,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRemovedAsFriendDynamoProcessorServiceConfigInterface {
  tableNames: Pick<EnvConfigInterface["tableNames"], "core">;
}
