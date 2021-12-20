import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord, LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { RawUser } from "../repositories/user.dynamo.repository";
import { MembershipRepositoryInterface } from "../repositories/membership.dynamo.repository";

@injectable()
export class UserNameUpdatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MembershipRepositoryInterface) private membershipRepository: MembershipRepositoryInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserNameUpdatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isUser = record.newImage.entityType === EntityType.User;
      const isUpdate = record.eventName === "MODIFY";
      const isNameUpdate = (record.newImage as RawUser).name === (record.oldImage as RawUser).name;

      return isCoreTable && isUser && isUpdate && isNameUpdate;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawUser>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: { id: userId, name: userName } } = record;

      const { memberships } = await this.membershipRepository.getMembershipsByUserId({ userId });

      await Promise.all(memberships.map(({ entityId }) => this.membershipRepository.updateMembership({ entityId, userId, updates: { userName } })));
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserNameUpdatedDynamoProcessorServiceConfigInterface {
  tableNames: {
    core: EnvConfigInterface["tableNames"]["core"];
  }
}
