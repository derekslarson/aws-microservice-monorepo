import "reflect-metadata";
import { LoggerServiceInterface, S3EventControllerInterface } from "@yac/core";
import { S3Event } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

export const handler = async (event: S3Event): Promise<void> => {
  const s3EventController = container.get<S3EventControllerInterface>(TYPES.S3EventControllerInterface);
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("imageFileCreated called", { event }, "imageFileCreated handler");

    await s3EventController.handleS3Event(event);
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in imageFileCreated handler", { error, event }, "imageFileCreated handler");
  }
};
