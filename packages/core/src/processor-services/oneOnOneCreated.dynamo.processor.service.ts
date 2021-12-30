import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "@yac/util/src/services/interfaces/dynamo.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserAddedAsFriendSnsServiceInterface } from "../sns-services/userAddedAsFriend.sns.service";
import { RawOneOnOne } from "../repositories/oneOnOne.dynamo.repository";
import { UserServiceInterface } from "../services/tier-1/user.service";

@injectable()
export class OneOnOneCreatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserAddedAsFriendSnsServiceInterface) private userAddedAsFriendSnsService: UserAddedAsFriendSnsServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedAsFriendDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isFriendConversation = record.newImage.entityType === EntityType.OneOnOne;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isFriendConversation && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawOneOnOne>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { createdBy, otherUserId } } = record;

      const [ { user: addingUser }, { user: addedUser } ] = await Promise.all([
        this.userService.getUser({ userId: createdBy }),
        this.userService.getUser({ userId: otherUserId }),
      ]);

      await this.userAddedAsFriendSnsService.sendMessage({
        addingUser,
        addedUser,
      });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedAsFriendDynamoProcessorServiceConfigInterface {
  tableNames: Pick<EnvConfigInterface["tableNames"], "core">;
}
