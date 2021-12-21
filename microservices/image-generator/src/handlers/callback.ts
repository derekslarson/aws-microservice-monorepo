import "reflect-metadata";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { generateInternalServerErrorResponse } from "@yac/util/src/util/internalServerError.response.generator";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { BannerbearControllerInterface } from "../controllers/bannerbear.controller";

const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);
const bannerbearController = container.get<BannerbearControllerInterface>(TYPES.BannerbearControllerInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("callback called", { event }, "callback handler");

    const response = await bannerbearController.callback(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in callback handler", { error, event }, "callback handler");

    return generateInternalServerErrorResponse(error);
  }
};
