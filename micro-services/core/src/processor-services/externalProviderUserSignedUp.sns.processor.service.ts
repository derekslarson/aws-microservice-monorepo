import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, SnsProcessorServiceInterface, SnsProcessorServiceRecord, ExternalProviderUserSignedUpSnsMessage } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { UserMediatorServiceInterface } from "../mediator-services/user.mediator.service";

@injectable()
export class ExternalProviderUserSignedUpSnsProcessorService implements SnsProcessorServiceInterface {
  private externalProviderUserSignedUpSnsTopicArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.UserMediatorServiceInterface) private userMediatorService: UserMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ExternalProviderUserSignedUpSnsProcessorServiceConfigInterface,
  ) {
    this.externalProviderUserSignedUpSnsTopicArn = envConfig.snsTopicArns.externalProviderUserSignedUp;
  }

  public determineRecordSupport(record: SnsProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.topicArn === this.externalProviderUserSignedUpSnsTopicArn;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: SnsProcessorServiceRecord<ExternalProviderUserSignedUpSnsMessage>): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { message: { email } } = record;

      await this.userMediatorService.createUser({ email });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export interface ExternalProviderUserSignedUpSnsProcessorServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "externalProviderUserSignedUp">;
}
