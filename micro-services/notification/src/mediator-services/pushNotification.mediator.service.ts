import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { PushNotificationServiceInterface } from "../services/pushNotification.service";
import { ListenerMappingServiceInterface } from "../entity-services/listenerMapping.service";
import { ListenerType } from "../enums/listenerType.enum";

@injectable()
export class PushNotificationMediatorService implements PushNotificationMediatorServiceInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ListenerMappingServiceInterface) private listenerMappingService: ListenerMappingServiceInterface,
    @inject(TYPES.PushNotificationServiceInterface) private pushNotificationService: PushNotificationServiceInterface,
  ) {}

  public async registerDevice(params: RegisterDeviceInput): Promise<RegisterDeviceOutput> {
    try {
      this.loggerService.trace("registerDevice called", { params }, this.constructor.name);

      const { userId, deviceId, deviceToken } = params;

      const { listenerMappings } = await this.listenerMappingService.getListenerMappingsByTypeAndValue({
        type: ListenerType.PushNotification,
        value: deviceId,
      });

      if (listenerMappings.length) {
        await Promise.all(listenerMappings.map((listenerMapping) => this.listenerMappingService.deleteListenerMapping({
          userId: listenerMapping.userId,
          type: listenerMapping.type,
          value: listenerMapping.value,
        })));
      }

      const { endpointArn } = await this.pushNotificationService.createPlatformEndpoint({ token: deviceToken });

      await this.listenerMappingService.createListenerMapping({ userId, type: ListenerType.PushNotification, value: deviceId, valueTwo: endpointArn });
    } catch (error: unknown) {
      this.loggerService.error("Error in registerDevice", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface PushNotificationMediatorServiceInterface {
  registerDevice(params: RegisterDeviceInput): Promise<RegisterDeviceOutput>;
}

export interface RegisterDeviceInput {
  userId: string;
  deviceId: string;
  deviceToken: string;
}

export type RegisterDeviceOutput = void;
