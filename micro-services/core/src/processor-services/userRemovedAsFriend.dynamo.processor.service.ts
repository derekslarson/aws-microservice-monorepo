import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserRemovedAsFriendSnsServiceInterface } from "../sns-services/userRemovedAsFriend.sns.service";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { FriendConversation, RawConversation } from "../repositories/conversation.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { UserId } from "../types/userId.type";

@injectable()
export class UserRemovedAsFriendDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserRemovedAsFriendSnsServiceInterface) private userRemovedAsFriendSnsService: UserRemovedAsFriendSnsServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedAsFriendDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isFriendConversation = record.oldImage.entityType === EntityType.FriendConversation;
      const isCreation = record.eventName === "REMOVE";

      return isCoreTable && isFriendConversation && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawConversation<FriendConversation>>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { oldImage: { id: conversationId, createdBy: userIdA } } = record;
      const userIdB = conversationId.replace(KeyPrefix.FriendConversation, "").replace(userIdA, "").replace(/^-|-$/, "") as UserId;

      const [ { user: userA }, { user: userB } ] = await Promise.all([
        this.userMediatorService.getUser({ userId: userIdA }),
        this.userMediatorService.getUser({ userId: userIdB }),
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
