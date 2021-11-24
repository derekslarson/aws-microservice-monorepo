import "reflect-metadata";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { generateInternalServerErrorResponse, LoggerServiceInterface } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { AuthControllerInterface } from "../controllers/auth.controller";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  const authController = container.get<AuthControllerInterface>(TYPES.AuthControllerInterface);
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("oauth2IdpResponse called", { event }, "oauth2IdpResponse handler");

    const response = await authController.completeExternalProviderAuthFlow(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in oauth2IdpResponse handler", { error, event }, "oauth2IdpResponse handler");

    return generateInternalServerErrorResponse(error);
  }
};
