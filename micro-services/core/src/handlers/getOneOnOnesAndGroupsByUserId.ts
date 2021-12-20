import "reflect-metadata";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { generateInternalServerErrorResponse } from "@yac/util/src/util/internalServerError.response.generator";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { ConversationControllerInterface } from "../controllers/conversation.controller";

const conversationController = container.get<ConversationControllerInterface>(TYPES.ConversationControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("getOneOnOnesAndGroupsByUserId called", { event }, "getOneOnOnesAndGroupsByUserId handler");

    const response = await conversationController.getOneOnOnesAndGroupsByUserId(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in getOneOnOnesAndGroupsByUserId handler", { error, event }, "getOneOnOnesAndGroupsByUserId handler");

    return generateInternalServerErrorResponse(error);
  }
};
