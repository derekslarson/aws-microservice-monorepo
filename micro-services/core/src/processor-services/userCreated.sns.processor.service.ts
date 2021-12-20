import "reflect-metadata";
import { injectable, inject } from "inversify";
import { SnsProcessorServiceInterface, SnsProcessorServiceRecord } from "@yac/util/src/services/interfaces/sns.processor.service.interface";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserCreatedSnsMessage } from "@yac/util/src/api-contracts/sns-topics/userCreated.snsMessage.model";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { UserServiceInterface } from "../services/tier-1/user.service";

@injectable()
export class UserCreatedSnsProcessorService implements SnsProcessorServiceInterface {
  private userCreatedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserCreatedSnsProcessorServiceConfigInterface,
  ) {
    this.userCreatedSnsTopicArn = envConfig.snsTopicArns.userCreated;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.userCreatedSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<UserCreatedSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: user } = record;

      await this.userService.createUser(user);
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserCreatedSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userCreated">;
}
