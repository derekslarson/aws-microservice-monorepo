import "reflect-metadata";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { LoggerServiceInterface, generateInternalServerErrorResponse } from "@yac/core";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { MediaControllerInterface } from "../controllers/media.controller";

// eslint-disable-next-line @typescript-eslint/require-await
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);
  const mediaController = container.get<MediaControllerInterface>(TYPES.MediaControllerInterface);

  try {
    loggerService.trace("imageRetrieve called", { event }, "imageRetrieve handler");

    const response = await mediaController.retrieveMedia(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in imageRetrieve handler", { error, event }, "imageRetrieve handler");

    return generateInternalServerErrorResponse(error);
  }
};
