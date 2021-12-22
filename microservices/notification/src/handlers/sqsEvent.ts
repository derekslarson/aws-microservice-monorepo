import "reflect-metadata"; import { SQSEvent } from "aws-lambda";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { SqsEventControllerInterface } from "@yac/util/src/controllers/sqsEvent.controller";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

const sqsEventController = container.get<SqsEventControllerInterface>(TYPES.SqsEventControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: SQSEvent): Promise<void> => {
  try {
    loggerService.trace("sqsEvent called", { event }, "sqsEvent handler");

    await sqsEventController.handleSqsEvent(event);
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in sqsEvent handler", { error, event }, "sqsEvent handler");
  }
};
