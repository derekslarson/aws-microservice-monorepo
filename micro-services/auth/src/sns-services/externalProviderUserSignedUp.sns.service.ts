import "reflect-metadata";
import { injectable, inject } from "inversify";

import { BaseSnsService, ExternalProviderUserSignedUpSnsMessage, LoggerServiceInterface, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class ExternalProviderUserSignedUpSnsService extends BaseSnsService<ExternalProviderUserSignedUpSnsMessage> implements ExternalProviderUserSignedUpSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: ExternalProviderUserSignedUpSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.externalProviderUserSignedUp, loggerService, snsFactory);
  }

  public async sendMessage(message: ExternalProviderUserSignedUpSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("clientsUpdated called", {}, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in clientsUpdated", { error }, this.constructor.name);

      throw error;
    }
  }
}

export interface ExternalProviderUserSignedUpSnsServiceInterface {
  sendMessage(message: ExternalProviderUserSignedUpSnsMessage): Promise<void>
}

export type ExternalProviderUserSignedUpSnsServiceConfigInterface = {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "externalProviderUserSignedUp">
};
