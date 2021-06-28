import "reflect-metadata";
import { LoggerServiceInterface, SnsEventControllerInterface } from "@yac/core";
import { SNSEvent } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

export const handler = async (event: SNSEvent): Promise<void> => {
  const snsEventController = container.get<SnsEventControllerInterface>(TYPES.SnsEventControllerInterface);
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("userSignedUp called", { event }, "userSignedUp handler");

    await snsEventController.handleSnsEvent(event);
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in userSignedUp handler", { error, event }, "userSignedUp handler");
  }
};
