import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { PushNotificationServiceInterface } from "../services/pushNotification.service";
import { ListenerMappingServiceInterface } from "../entity-services/listenerMapping.service";
import { ListenerType } from "../enums/listenerType.enum";
import { PushNotificationEvent } from "../enums/pushNotification.event.enum";
import { BaseIntegrationMediatorService } from "./base.integration.mediator.service";

@injectable()
export class PushNotificationMediatorService extends BaseIntegrationMediatorService implements PushNotificationMediatorServiceInterface {
  constructor(
    @inject(TYPES.PushNotificationServiceInterface) private pushNotificationService: PushNotificationServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.ListenerMappingServiceInterface) listenerMappingService: ListenerMappingServiceInterface,
  ) {
    super(ListenerType.PushNotification, loggerService, listenerMappingService);
  }

  public async registerDevice(params: RegisterDeviceInput): Promise<RegisterDeviceOutput> {
    try {
      this.loggerService.trace("registerDevice called", { params }, this.constructor.name);

      const { userId, deviceId, deviceToken } = params;

      await this.deleteListener({ listener: { value: deviceId } });

      const { endpointArn } = await this.pushNotificationService.createPlatformEndpoint({ token: deviceToken });

      await this.persistListener({ userId, listener: { value: deviceId, valueTwo: endpointArn } });
    } catch (error: unknown) {
      this.loggerService.error("Error in registerDevice", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async sendPushNotification(params: SendPushNotificationInput): Promise<SendPushNotificationOutput> {
    try {
      this.loggerService.trace("sendPushNotification called", { params }, this.constructor.name);

      const { userId, event, title, body } = params;

      const { listeners } = await this.getListenersByUserId({ userId });

      await Promise.allSettled(listeners.map((listener) => this.pushNotificationService.sendPushNotification({
        endpointArn: listener.valueTwo as string,
        event,
        title,
        body,
      })));
    } catch (error: unknown) {
      this.loggerService.error("Error in sendPushNotification", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface PushNotificationMediatorServiceInterface {
  registerDevice(params: RegisterDeviceInput): Promise<RegisterDeviceOutput>;
  sendPushNotification(params: SendPushNotificationInput): Promise<SendPushNotificationOutput>;
}

export interface RegisterDeviceInput {
  userId: string;
  deviceId: string;
  deviceToken: string;
}

export type RegisterDeviceOutput = void;

interface SendPushNotificationInput {
  userId: string;
  event: PushNotificationEvent;
  title: string;
  body: string;
}

export type SendPushNotificationOutput = void;
