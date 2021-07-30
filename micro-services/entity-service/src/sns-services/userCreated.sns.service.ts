import "reflect-metadata";
import { injectable, inject } from "inversify";
import { UserCreatedSnsMessage, LoggerServiceInterface, BaseSnsService, SnsFactory } from "@yac/util";
import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class UserCreatedSnsService extends BaseSnsService<UserCreatedSnsMessage> implements UserCreatedSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: UserCreatedSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.userCreated as string, loggerService, snsFactory);
  }

  public async sendMessage(message: UserCreatedSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface UserCreatedSnsServiceInterface {
  sendMessage(message: UserCreatedSnsMessage): Promise<void>;
}

export type UserCreatedSnsServiceConfigInterface = Pick<EnvConfigInterface, "snsTopicArns">;
