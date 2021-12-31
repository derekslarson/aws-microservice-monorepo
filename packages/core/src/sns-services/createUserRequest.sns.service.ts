import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseSnsService } from "@yac/util/src/services/base.sns.service";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { CreateUserRequestSnsMessage } from "@yac/util/src/api-contracts/sns-topics/createUserRequest.snsMessage.model";
import { SnsFactory } from "@yac/util/src/factories/sns.factory";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class CreateUserRequestSnsService extends BaseSnsService<CreateUserRequestSnsMessage> implements CreateUserRequestSnsServiceInterface {
  constructor(
  @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
    @inject(TYPES.EnvConfigInterface) envConfig: CreateUserRequestSnsServiceConfigInterface,
  ) {
    super(envConfig.snsTopicArns.createUserRequest, loggerService, snsFactory);
  }

  public async sendMessage(message: CreateUserRequestSnsMessage): Promise<void> {
    try {
      this.loggerService.trace("sendMessage called", { message }, this.constructor.name);

      await this.publish(message);
    } catch (error: unknown) {
      this.loggerService.error("Error in sendMessage", { error, message }, this.constructor.name);

      throw error;
    }
  }
}

export interface CreateUserRequestSnsServiceInterface {
  sendMessage(message: CreateUserRequestSnsMessage): Promise<void>;
}

export interface CreateUserRequestSnsServiceConfigInterface {
  snsTopicArns: Pick<EnvConfigInterface["snsTopicArns"], "createUserRequest">;
}
