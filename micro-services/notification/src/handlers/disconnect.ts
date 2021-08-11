import "reflect-metadata";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { LoggerServiceInterface, generateInternalServerErrorResponse } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { WebSocketControllerInterface } from "../controllers/webSocket.controller";

const webSocketController = container.get<WebSocketControllerInterface>(TYPES.WebSocketControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("disconnect called", { event }, "disconnect handler");

    const response = await webSocketController.disconnect(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in disconnect handler", { error, event }, "disconnect handler");

    return generateInternalServerErrorResponse(error);
  }
};
