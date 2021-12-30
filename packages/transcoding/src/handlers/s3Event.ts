import "reflect-metadata";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { S3EventControllerInterface } from "@yac/util/src/controllers/s3Event.controller";
import { S3Event } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

const s3EventController = container.get<S3EventControllerInterface>(TYPES.S3EventControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: S3Event): Promise<void> => {
  try {
    loggerService.trace("s3Event called", { event }, "s3Event handler");

    await s3EventController.handleS3Event(event);
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in s3Event handler", { error, event }, "s3Event handler");
  }
};
