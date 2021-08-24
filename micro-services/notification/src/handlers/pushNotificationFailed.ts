/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { LoggerServiceInterface } from "@yac/util";
import { SNSEvent } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: SNSEvent): Promise<void> => {
  try {
    loggerService.trace("pushNotificationFailed called", { event }, "pushNotificationFailed handler");
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in pushNotificationFailed handler", { error, event }, "pushNotificationFailed handler");
  }
};
