import "reflect-metadata";
import { generateInternalServerErrorResponse, LoggerServiceInterface } from "@yac/util";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { FriendControllerInterface } from "../controllers/oneOnOne.controller";

const friendController = container.get<FriendControllerInterface>(TYPES.FriendControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("getFriendsByUserId called", { event }, "getFriendsByUserId handler");

    const response = await friendController.getFriendsByUserId(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in getFriendsByUserId handler", { error, event }, "getFriendsByUserId handler");

    return generateInternalServerErrorResponse(error);
  }
};
