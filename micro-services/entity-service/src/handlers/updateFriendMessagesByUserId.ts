import "reflect-metadata";
import { generateInternalServerErrorResponse, LoggerServiceInterface } from "@yac/core";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { MessageControllerInterface } from "../controllers/message.controller";

const messageController = container.get<MessageControllerInterface>(TYPES.MessageControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("updateFriendMessagesByUserId called", { event }, "updateFriendMessagesByUserId handler");

    const response = await messageController.updateFriendMessagesByUserId(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in updateFriendMessagesByUserId handler", { error, event }, "updateFriendMessagesByUserId handler");

    return generateInternalServerErrorResponse(error);
  }
};
