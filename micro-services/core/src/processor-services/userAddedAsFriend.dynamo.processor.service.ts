import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { UserAddedAsFriendSnsServiceInterface } from "../sns-services/userAddedAsFriend.sns.service";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";
import { FriendConversation, RawConversation } from "../repositories/conversation.dynamo.repository";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { UserId } from "../types/userId.type";

@injectable()
export class UserAddedAsFriendDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserAddedAsFriendSnsServiceInterface) private userAddedAsFriendSnsService: UserAddedAsFriendSnsServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedAsFriendDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isFriendConversation = record.newImage.entityType === EntityType.FriendConversation;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isFriendConversation && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawConversation<FriendConversation>>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { id: conversationId, createdBy: addingUserId } } = record;
      const addedUserId = conversationId.replace(KeyPrefix.FriendConversation, "").replace(addingUserId, "").replace(/^-|-$/, "") as UserId;

      const [ { user: addingUser }, { user: addedUser } ] = await Promise.all([
        this.userMediatorService.getUser({ userId: addingUserId }),
        this.userMediatorService.getUser({ userId: addedUserId }),
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
