/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { APIGatewayRequestAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";
import { LoggerServiceInterface } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { TokenServiceInterface } from "../services/tier-1/token.service";

const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);
const tokenService = container.get<TokenServiceInterface>(TYPES.TokenServiceInterface);

export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  try {
    loggerService.trace("authorizer called", { event }, "authorizer handler");

    const isWebSocketConnectAttempt = event.requestContext.eventType === "CONNECT";

    const tokenString = isWebSocketConnectAttempt ? event.queryStringParameters?.token : event.headers?.authorization;

    if (!tokenString) {
      throw new Error("token missing from event");
    }

    if (!isWebSocketConnectAttempt && !tokenString.startsWith("Bearer ")) {
      throw new Error(`Invalid authorization token - ${tokenString} does not match "Bearer .*"`);
    }

    const accessToken = tokenString.replace("Bearer ", "");

    const { decodedToken: { sub: userId, scope } } = await tokenService.verifyAccessToken({ accessToken });

    return {
      principalId: userId,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: "*",
          },
        ],
      },
      context: {
        userId,
        scope,
      },
    };
  } catch (error: unknown) {
    loggerService.error("Error in authorizer handler", { error, event }, "authorizer handler");

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
