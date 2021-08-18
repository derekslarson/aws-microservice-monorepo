import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { GroupCreatedSnsServiceInterface } from "../sns-services/groupCreated.sns.service";
import { GroupMediatorServiceInterface } from "../mediator-services/group.mediator.service";
import { RawConversation } from "../repositories/conversation.dynamo.repository";
import { GroupConversation } from "../entity-services/conversation.service";

@injectable()
export class GroupCreatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.GroupCreatedSnsServiceInterface) private groupCreatedSnsService: GroupCreatedSnsServiceInterface,
    @inject(TYPES.GroupMediatorServiceInterface) private groupMediatorService: GroupMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserCreatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isGroup = record.newImage.entityType === EntityType.GroupConversation;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isGroup && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawConversation<GroupConversation>>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { id: groupId } } = record;

      const [ { group } ] = await Promise.all([
        this.groupMediatorService.getGroup({ groupId })
      ]);

      await this.groupCreatedSnsService.sendMessage({ group, groupMemberIds: [ group.createdBy ] });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserCreatedDynamoProcessorServiceConfigInterface {
  tableNames: {
    core: EnvConfigInterface["tableNames"]["core"];
  }
}
