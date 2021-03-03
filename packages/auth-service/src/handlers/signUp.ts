import "reflect-metadata";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { LoggerServiceInterface, generateInternalServerErrorResponse } from "@yac/core";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { AuthenticationControllerInterface } from "../controllers/authentication.controller";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  const authenticationController = container.get<AuthenticationControllerInterface>(TYPES.AuthenticationControllerInterface);
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("signUp called", { event }, "signUp handler");

    const response = await authenticationController.signUp(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in signUp handler", { error, event }, "signUp handler");

    return generateInternalServerErrorResponse(error);
  }
};
