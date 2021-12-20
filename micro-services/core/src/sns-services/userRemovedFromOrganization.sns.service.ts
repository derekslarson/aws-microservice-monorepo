import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseSnsService } from "@yac/util/src/services/base.sns.service";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { UserRemovedFromOrganizationSnsMessage } from "@yac/util/src/api-contracts/sns-topics/userRemovedFromOrganization.snsMessage.model";
import { SnsFactory } from "@yac/util/src/factories/sns.factory";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserRemovedFromOrganizationSnsService extends BaseSnsService<UserRemovedFromOrganizationSnsMessage> implements UserRemovedFromOrganizationSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: UserRemovedFromOrganizationSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.userRemovedFromOrganization, loggerService, snsFactory);
  }

  public async sendMessage(message: UserRemovedFromOrganizationSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserRemovedFromOrganizationSnsServiceInterface {
  sendMessage(message: UserRemovedFromOrganizationSnsMessage): Promise<void>;
}

export interface UserRemovedFromOrganizationSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userRemovedFromOrganization">
}
