import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "@yac/util/src/services/interfaces/dynamo.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { EntityType } from "../enums/entityType.enum";
import { RawPendingInvitation } from "../repositories/pendingInvitation.dynamo.repository";
import { CreateUserRequestSnsServiceInterface } from "../sns-services/createUserRequest.sns.service";

@injectable()
export class PendingInvitationCreatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private coreTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.CreateUserRequestSnsServiceInterface) private createUserRequestSnsService: CreateUserRequestSnsServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: PendingInvitationCreatedDynamoProcessorServiceConfigInterface,
  ) {
    this.coreTableName = envConfig.tableNames.core;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.coreTableName;
      const isPendingInvitation = record.newImage.entityType === EntityType.PendingInvitation;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isPendingInvitation && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawPendingInvitation>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: pendingInvitation } = record;

      await this.createUserRequestSnsService.sendMessage("email" in pendingInvitation ? { email: pendingInvitation.email } : { phone: pendingInvitation.phone });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface PendingInvitationCreatedDynamoProcessorServiceConfigInterface {
  tableNames: {
    core: EnvConfigInterface["tableNames"]["core"];
  }
}
