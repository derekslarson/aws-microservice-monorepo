/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";
import { LoggerServiceInterface } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { AuthControllerInterface } from "../controllers/auth.controller";

const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);
const authController = container.get<AuthControllerInterface>(TYPES.AuthControllerInterface);

export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  try {
    loggerService.trace("authorizer called", { event }, "authorizer handler");

    const response = await authController.authorizeRequest(event);

    return response;
  } catch (error: unknown) {
    loggerService.error("Error in authorizer handler", { error, event }, "authorizer handler");

    // We should never get here, but if we do, return a deny response
    return {
      principalId: event.requestContext.requestId,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Deny",
            Resource: "*",
          },
        ],
      },
      context: {},
    };
  }
};
