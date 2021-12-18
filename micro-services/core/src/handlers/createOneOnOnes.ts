import "reflect-metadata";
import { generateInternalServerErrorResponse, LoggerServiceInterface } from "@yac/util";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { OneOnOneControllerInterface } from "../controllers/oneOnOne.controller";

const oneOnOneController = container.get<OneOnOneControllerInterface>(TYPES.OneOnOneControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("createOneOnOnes called", { event }, "createOneOnOnes handler");

    const response = await oneOnOneController.createOneOnOnes(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in createOneOnOnes handler", { error, event }, "createOneOnOnes handler");

    return generateInternalServerErrorResponse(error);
  }
};
