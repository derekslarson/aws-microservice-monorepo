import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, UserSignedUpSnsMessage } from "@yac/core";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { UserServiceInterface } from "./user.service";
import { UserCreationInput } from "../models/user.creation.input.model";

@injectable()
export class UserSignedUpProcessorService implements SnsProcessorServiceInterface {
  private userSignedUpSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserServiceInterface) private userService: UserServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: UserSignedUpProcessorServiceConfigInterface,
  ) {
    this.userSignedUpSnsTopicArn = envConfig.snsTopicArns.userSignedUp as string;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.userSignedUpSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<UserSignedUpSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const message = record.message as unknown as UserSignedUpSnsMessage;

      const userCreationInput: UserCreationInput = {
        id: message.id,
        email: message.email,
      };

      await this.userService.createUser(userCreationInput);
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export type UserSignedUpProcessorServiceConfigInterface = Pick<EnvConfigInterface, "snsTopicArns">;
