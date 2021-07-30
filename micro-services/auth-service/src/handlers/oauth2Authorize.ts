import "reflect-metadata";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { generateInternalServerErrorResponse, LoggerServiceInterface } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { AuthorizationControllerInterface } from "../controllers/authorization.controller";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  const authorizationController = container.get<AuthorizationControllerInterface>(TYPES.AuthorizationControllerInterface);
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("oauth2Authorize called", { event }, "oauth2Authorize handler");

    const response = await authorizationController.authorize(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in oauth2Authorize handler", { error, event }, "oauth2Authorize handler");

    return generateInternalServerErrorResponse(error);
  }
};
