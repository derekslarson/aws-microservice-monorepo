import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BillingPlanUpdatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
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
