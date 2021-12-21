import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ForbiddenError, ValidationServiceV2Interface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { RegisterDeviceDto } from "../dtos/registerDevice.dto";
import { PushNotificationMediatorServiceInterface } from "../mediator-services/pushNotification.mediator.service";

@injectable()
export class PushNotificationController extends BaseController implements PushNotificationControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.PushNotificationMediatorServiceInterface) private pushNotificationMediatorService: PushNotificationMediatorServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {
    super();
  }

  public async registerDevice(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("registerDevice called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { userId },
        body: { id, token },
      } = this.validationService.validate({ dto: RegisterDeviceDto, request, getUserIdFromJwt: true });

      if (jwtId !== userId) {
        throw new ForbiddenError("Forbidden");
      }

      await this.pushNotificationMediatorService.registerDevice({ userId, deviceId: id, deviceToken: token });

      return this.generateSuccessResponse({ message: "Device registered" });
    } catch (error: unknown) {
      this.loggerService.error("Error in registerDevice", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface PushNotificationControllerInterface {
  registerDevice(request: Request): Promise<Response>;
}
