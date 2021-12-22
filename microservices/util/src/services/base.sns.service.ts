import "reflect-metadata";
import { injectable, unmanaged } from "inversify";
import { SNS } from "aws-sdk";
import { SnsFactory } from "../factories/sns.factory";
import { LoggerServiceInterface } from "./logger.service";

@injectable()
export abstract class BaseSnsService<T> {
  protected sns: SNS;

  constructor(
    @unmanaged() protected topicArn: string,
    @unmanaged() protected loggerService: LoggerServiceInterface,
    @unmanaged() snsFactory: SnsFactory,
  ) {
    this.sns = snsFactory();
  }

  protected async publish(message: T): Promise<void> {
    try {
      this.loggerService.trace("publish called", { message }, this.constructor.name);

      const publishInput: SNS.Types.PublishInput = {
        TopicArn: this.topicArn,
        Message: JSON.stringify(message),
      };

      await this.sns.publish(publishInput).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in publish", { error, message }, this.constructor.name);

      throw error;
    }
  }
}
