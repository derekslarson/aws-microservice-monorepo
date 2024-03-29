import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "@yac/util/src/services/interfaces/dynamo.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { RawUser } from "../repositories/user.dynamo.repository";
import { EntityType } from "../enums/entityType.enum";
import { UserCreatedSnsServiceInterface } from "../sns-services/userCreated.sns.service";

@injectable()
export class UserCreatedDynamoProcessorService implements DynamoProcessorServiceInterface {
  private authTableName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserCreatedSnsServiceInterface) private userCreatedSnsService: UserCreatedSnsServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserCreatedDynamoProcessorServiceConfigInterface,
  ) {
    this.authTableName = envConfig.tableNames.auth;
  }

  public determineRecordSupport(record: DynamoProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      const isCoreTable = record.tableName === this.authTableName;
      const isUser = record.newImage.entityType === EntityType.User;
      const isCreation = record.eventName === "INSERT";

      return isCoreTable && isUser && isCreation;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: DynamoProcessorServiceRecord<RawUser>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { newImage: user } = record;

      await this.userCreatedSnsService.sendMessage({ id: user.id, email: user.email, phone: user.phone, name: user.name });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserCreatedDynamoProcessorServiceConfigInterface {
  tableNames: {
    auth: EnvConfigInterface["tableNames"]["auth"];
  }
}
