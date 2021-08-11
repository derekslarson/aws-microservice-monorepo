import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, UserCreatedSnsMessage } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { AuthenticationServiceInterface } from "../services/authentication.service";

@injectable()
export class UserCreatedProcessorService implements SnsProcessorServiceInterface {
  private userCreatedSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.AuthenticationServiceInterface) private authenticationService: AuthenticationServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserCreatedProcessorServiceConfigInterface,
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

      const { message } = record;

      await this.authenticationService.createUser({ id: message.id, email: message.email, phone: message.phone });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export type UserCreatedProcessorServiceConfigInterface = Pick<EnvConfigInterface, "snsTopicArns">;
