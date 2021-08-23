/* eslint-disable max-len */
import { inject, injectable } from "inversify";
import { LoggerServiceInterface, SnsFactory } from "@yac/util";
import { SNS } from "aws-sdk";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { PushNotificationEvent } from "../enums/pushNotification.event.enum";

@injectable()
export class PushNotificationService implements PushNotificationServiceInterface {
  private sns: SNS;

  private platformApplicationArn: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: PushNotificationServiceConfig,
    @inject(TYPES.SnsFactory) snsFactory: SnsFactory,
  ) {
    this.platformApplicationArn = config.platformApplicationArn;
    this.sns = snsFactory();
  }

  public async createPlatformEndpoint(params: CreatePlatformEndpointInput): Promise<CreatePlatformEndpointOutput> {
    try {
      this.loggerService.trace("createPlatformEndpoint called", { params }, this.constructor.name);

      const { token } = params;

      const { EndpointArn } = await this.sns.createPlatformEndpoint({ PlatformApplicationArn: this.platformApplicationArn, Token: token }).promise();

      if (!EndpointArn) {
        throw new Error("EndpointArn not returned from sns.createPlatformEndpoint");
      }

      return { endpointArn: EndpointArn };
    } catch (error: unknown) {
      this.loggerService.error("Error in createPlatformEndpoint", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async sendPushNotification(params: SendPushNotificationInput): Promise<SendPushNotificationOutput> {
    try {
      this.loggerService.trace("sendPushNotification called", { params }, this.constructor.name);

      const { endpointArn, event, data } = params;

      const stringifiedMessage = JSON.stringify({ event, data });

      await this.sns.publish({
        Message: stringifiedMessage,
        TargetArn: endpointArn,
        MessageStructure: "json",
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in sendPushNotification", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

type PushNotificationServiceConfig = Pick<EnvConfigInterface, "platformApplicationArn">;

export interface PushNotificationServiceInterface {
  createPlatformEndpoint(params: CreatePlatformEndpointInput): Promise<CreatePlatformEndpointOutput>;
  sendPushNotification(params: SendPushNotificationInput): Promise<SendPushNotificationOutput>;
}

export interface CreatePlatformEndpointInput {
  token: string;
}

export interface CreatePlatformEndpointOutput {
  endpointArn: string;
}

export interface SendPushNotificationInput {
  endpointArn: string;
  event: PushNotificationEvent;
  data: Record<string, unknown>;
}

export type SendPushNotificationOutput = void;
