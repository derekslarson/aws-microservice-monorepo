import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface } from "./logger.service";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { BaseSnsService } from "./base.sns.service";
import { SnsFactory } from "../factories/sns.factory";
import { ClientsUpdatedSnsMessage } from "../api-contracts/sns.topics";

@injectable()
export class ClientsUpdatedSnsService extends BaseSnsService<ClientsUpdatedSnsMessage> implements ClientsUpdatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: ClientsUpdatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.clientsUpdated as string, loggerService, snsFactory);
  }

  public async sendMessage(): Promise<void> {
    try {
      this.loggerService.trace("clientsUpdated called", {}, this.constructor.name);

      await this.publish({});
    } catch (error: unknown) {
      this.loggerService.error("Error in clientsUpdated", { error }, this.constructor.name);

      throw error;
    }
  }
}

export interface ClientsUpdatedSnsServiceInterface {
  sendMessage(): Promise<void>;
}

export type ClientsUpdatedSnsServiceConfigInterface = Pick<EnvConfigInterface, "snsTopicArns">;
