/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { APIGatewayRequestAuthorizerEvent } from "aws-lambda";
import { LoggerServiceInterface } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { TokenServiceInterface } from "../services/token.service";
import { SessionRepositoryInterface } from "../repositories/session.dyanmo.repository";

const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);
const tokenService = container.get<TokenServiceInterface>(TYPES.TokenServiceInterface);
const sessionRepository = container.get<SessionRepositoryInterface>(TYPES.SessionRepositoryInterface);

export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<{ isAuthorized: boolean; context: Record<string, any>; }> => {
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

    const { decodedToken: { cid: clientId, sid: sessionId, sub: userId, scope } } = await tokenService.verifyAccessToken({ accessToken });

    // Check if access token has been revoked
    await sessionRepository.getSession({ clientId, sessionId });

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
