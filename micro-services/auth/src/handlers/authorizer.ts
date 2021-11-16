/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { APIGatewayRequestAuthorizerEvent } from "aws-lambda";
import { LoggerServiceInterface, TokenVerificationServiceInterface } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { ExternalProviderUserMappingServiceInterface } from "../services/externalProviderUserMapping.service";

const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);
const tokenVerificationService = container.get<TokenVerificationServiceInterface>(TYPES.TokenVerificationServiceInterface);
const externalProviderUserMappingService = container.get<ExternalProviderUserMappingServiceInterface>(TYPES.ExternalProviderUserMappingServiceInterface);

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

    const [ , token ] = match;

    const { decodedToken: { username: userIdOrExternalProviderId, scope } } = await tokenVerificationService.verifyToken({ token });

    const scopes = scope ? scope.split(" ") : [];

    if (userIdOrExternalProviderId.startsWith("user-")) {
      return {
        isAuthorized: true,
        context: { userId: userIdOrExternalProviderId, scopes },
      };
    }

    const { externalProviderUserMappings: [ externalProviderUserMapping ] } = await externalProviderUserMappingService.getExternalProviderUserMappingsByExternalProviderId({ externalProviderId: userIdOrExternalProviderId });

    if (!externalProviderUserMapping) {
      throw new Error(`externalProviderUserMapping not found for externalProviderId: ${userIdOrExternalProviderId}`);
    }

    return {
      isAuthorized: true,
      context: { userId: externalProviderUserMapping.userId, scopes },
    };
  } catch (error: unknown) {
    loggerService.error("Error in authorizer handler", { error, event }, "authorizer handler");

    return {
      isAuthorized: false,
      context: {},
    };
  }
};
