import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, LoggerServiceInterface, Request, Response, ValidationServiceV2Interface } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { ConnectDto } from "../dtos/connect.dto";
import { DisconnectDto } from "../dtos/disconnect.dto";
import { TokenVerificationServiceInterface } from "../services/tokenVerification.service";

@injectable()
export class WebSocketController extends BaseController implements WebSocketControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.TokenVerificationServiceInterface) private tokenVerificationService: TokenVerificationServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.WebSocketMediatorServiceInterface) private webSocketMediatorService: WebSocketMediatorServiceInterface,
  ) {
    super();
  }

  public async connect(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("connect called", { request }, this.constructor.name);

      const {
        queryStringParameters: { token },
        requestContext: { connectionId },
      } = this.validationService.validate({ dto: ConnectDto, request });

      const { decodedToken: { username: userId } } = await this.tokenVerificationService.verifyToken({ token });

      await this.webSocketMediatorService.persistListener({ userId, listener: connectionId });

      return { statusCode: 200 };
    } catch (error: unknown) {
      this.loggerService.error("Error in connect", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async disconnect(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("disconnect called", { request }, this.constructor.name);

      const { requestContext: { connectionId } } = this.validationService.validate({ dto: DisconnectDto, request });

      await this.webSocketMediatorService.deleteListener({ listener: connectionId });

      return { statusCode: 200 };
    } catch (error: unknown) {
      this.loggerService.error("Error in disconnect", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface WebSocketControllerInterface {
  connect(event: Request): Promise<Response>;
  disconnect(event: Request): Promise<Response>;
}
