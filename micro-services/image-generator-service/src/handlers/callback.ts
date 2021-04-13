import "reflect-metadata";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { LoggerServiceInterface, generateInternalServerErrorResponse } from "@yac/core";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

// eslint-disable-next-line @typescript-eslint/require-await
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("callback called", { event }, "callback handler");

    return { };
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in callback handler", { error, event }, "callback handler");

    return generateInternalServerErrorResponse(error);
  }
};
