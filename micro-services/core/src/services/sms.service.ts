import "reflect-metadata";
import { inject, injectable } from "inversify";
import { SNS } from "aws-sdk";
import { SnsFactory } from "../factories/sns.factory";
import { LoggerServiceInterface } from "./logger.service";
import { TYPES } from "../inversion-of-control/types";

@injectable()
export class SmsService {
  private sns: SNS;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
  ) {
    this.sns = snsFactory();
  }

  public async publish(params: PublishInput): Promise<PublishOutput> {
    try {
      this.loggerService.trace("publish called", { params }, this.constructor.name);

      const { phoneNumber, message } = params;

      const publishInput: SNS.PublishInput = {
        PhoneNumber: phoneNumber,
        Message: message,
        MessageAttributes: {
          "AWS.SNS.SMS.SenderID": {
            DataType: "String",
            StringValue: "Yac",
          },
          "AWS.MM.SMS.OriginationNumber": {
            DataType: "String",
            StringValue: "+18446920207",
          },
          "AWS.SNS.SMS.SMSType": {
            DataType: "String",
            StringValue: "Transactional",
          },
        },
      };

      await this.sns.publish(publishInput).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in publish", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface SmsServiceInterface {
  publish(params: PublishInput): Promise<PublishOutput>;
}

export interface PublishInput {
  phoneNumber: string;
  message: string;
}

export type PublishOutput = void;
