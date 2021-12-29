import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { BaseSnsService } from "@yac/util/src/services/base.sns.service";
import { BillingPlanUpdatedSnsMessage } from "@yac/util/src/api-contracts/sns-topics/billingPlanUpdated.snsMessage.model";
import { SnsFactory } from "@yac/util/src/factories/sns.factory";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class BillingPlanUpdatedSnsService extends BaseSnsService<BillingPlanUpdatedSnsMessage> implements BillingPlanUpdatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: BillingPlanUpdatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.billingPlanUpdated, loggerService, snsFactory);
  }

  public async sendMessage(message: BillingPlanUpdatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface BillingPlanUpdatedSnsServiceInterface {
  sendMessage(message: BillingPlanUpdatedSnsMessage): Promise<void>;
}

export interface BillingPlanUpdatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "billingPlanUpdated">;
}
