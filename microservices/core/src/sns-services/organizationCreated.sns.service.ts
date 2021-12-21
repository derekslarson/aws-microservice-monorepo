import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseSnsService } from "@yac/util/src/services/base.sns.service";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { OrganizationCreatedSnsMessage } from "@yac/util/src/api-contracts/sns-topics/organizationCreated.snsMessage.model";
import { SnsFactory } from "@yac/util/src/factories/sns.factory";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class OrganizationCreatedSnsService extends BaseSnsService<OrganizationCreatedSnsMessage> implements OrganizationCreatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: OrganizationCreatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.organizationCreated, loggerService, snsFactory);
  }

  public async sendMessage(message: OrganizationCreatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface OrganizationCreatedSnsServiceInterface {
  sendMessage(message: OrganizationCreatedSnsMessage): Promise<void>;
}

export interface OrganizationCreatedSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "organizationCreated">;
}
