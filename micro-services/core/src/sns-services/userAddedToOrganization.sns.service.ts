import "reflect-metadata";
import { injectable, inject } from "inversify";
import { UserAddedToOrganizationSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserAddedToOrganizationSnsService extends BaseSnsService<UserAddedToOrganizationSnsMessage> implements UserAddedToOrganizationSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: UserAddedToOrganizationSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.userAddedToOrganization, loggerService, snsFactory);
  }

  public async sendMessage(message: UserAddedToOrganizationSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserAddedToOrganizationSnsServiceInterface {
  sendMessage(message: UserAddedToOrganizationSnsMessage): Promise<void>;
}

export interface UserAddedToOrganizationSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "userAddedToOrganization">
}
