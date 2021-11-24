/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { APIGatewayRequestAuthorizerEvent } from "aws-lambda";
import { LoggerServiceInterface, UserId } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { TokenServiceInterface } from "../services/tier-1/token.service";

const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);
const tokenService = container.get<TokenServiceInterface>(TYPES.TokenServiceInterface);

export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<{ isAuthorized: boolean; context: { userId?: UserId; scopes?: string[]; }; }> => {
  try {
    loggerService.trace("authorizer called", { event }, "authorizer handler");

    const tokenString = event.headers?.authorization;

    if (!tokenString) {
      throw new Error('Expected "authorization" header to be set');
    }

    const match = /^Bearer (.*)$/.exec(tokenString);

    if (!match || match.length < 2) {
      throw new Error(`Invalid authorization token - ${tokenString} does not match "Bearer .*"`);
    }

    const [ , accessToken ] = match;

    const { decodedToken: { sub: userId, scope } } = await tokenService.verifyAccessToken({ accessToken });

    const scopes = scope ? scope.split(" ") : [];

    return {
      isAuthorized: true,
      context: { userId, scopes },
    };
  } catch (error: unknown) {
    loggerService.error("Error in authorizer handler", { error, event }, "authorizer handler");

    return {
      isAuthorized: false,
      context: {},
    };
  }
};
