import "reflect-metadata";
import { LoggerServiceInterface, SqsEventControllerInterface } from "@yac/util";
import { SQSEvent } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

export const handler = async (event: SQSEvent): Promise<void> => {
  const sqsEventController = container.get<SqsEventControllerInterface>(TYPES.SqsEventControllerInterface);
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("sqsEvent called", { event }, "sqsEvent handler");

    await sqsEventController.handleSqsEvent(event);
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in sqsEvent handler", { error, event }, "sqsEvent handler");
  }
};
