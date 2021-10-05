import "reflect-metadata";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { LoggerServiceInterface, generateInternalServerErrorResponse } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { MessagesControllerInterface } from "../controllers/messages.controller";

// eslint-disable-next-line @typescript-eslint/require-await
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);
const messageController = container.get<MessagesControllerInterface>(TYPES.MessagesController);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("finishChunkUpload called", { event }, "finishChunkUpload handler");

    const response = await messageController.finishUpload(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in finishChunkUpload handler", { error, event }, "finishChunkUpload handler");

    return generateInternalServerErrorResponse(error);
  }
};
