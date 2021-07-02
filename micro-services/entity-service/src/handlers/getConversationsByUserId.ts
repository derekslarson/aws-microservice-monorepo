import "reflect-metadata";
import { generateInternalServerErrorResponse, LoggerServiceInterface } from "@yac/core";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { ConversationControllerInterface } from "../controllers/conversation.controller";

const conversationController = container.get<ConversationControllerInterface>(TYPES.ConversationControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("getConversationsByUserId called", { event }, "getConversationsByUserId handler");

    const response = await conversationController.getConversationsByUserId(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in getConversationsByUserId handler", { error, event }, "getConversationsByUserId handler");

    return generateInternalServerErrorResponse(error);
  }
};
