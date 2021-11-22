import "reflect-metadata";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { LoggerServiceInterface, generateInternalServerErrorResponse } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { AuthControllerInterface } from "../controllers/auth.controller";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  const authController = container.get<AuthControllerInterface>(TYPES.AuthControllerInterface);
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("confirm called", { event }, "confirm handler");

    const response = await authController.confirm(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in confirm handler", { error, event }, "confirm handler");

    return generateInternalServerErrorResponse(error);
  }
};
