import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ValidationServiceV2Interface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { WebSocketMediatorServiceInterface } from "../mediator-services/websocket.mediator.service";
import { ConnectDto } from "../dtos/connect.dto";
import { DisconnectDto } from "../dtos/disconnect.dto";

@injectable()
export class WebSocketController extends BaseController implements WebsocketControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
  ) {
    super();
  }

  public async connect(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("connect called", { request }, this.constructor.name);

      const {
        queryStringParameters: { userId },
        requestContext: { connectionId },
      } = this.validationService.validate({ dto: ConnectDto, request });

      await this.webSocketMediatorService.connect({ userId, connectionId });
      return this.generateSuccessResponse({ message: "Connected" });
    } catch (error: unknown) {
      this.loggerService.error("Error in connectClient", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async disconnect(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("disconnect called", { request }, this.constructor.name);

      const { requestContext: { connectionId } } = this.validationService.validate({ dto: DisconnectDto, request });

      await this.webSocketMediatorService.disconnect({ connectionId });

      return this.generateSuccessResponse({ message: "Disconnected" });
    } catch (error: unknown) {
      this.loggerService.error("Error in connectClient", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface WebsocketControllerInterface {
  connect(event: Request): Promise<Response>;
}
