import "reflect-metadata";
import { injectable, inject } from "inversify";
import { OrganizationCreatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
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
