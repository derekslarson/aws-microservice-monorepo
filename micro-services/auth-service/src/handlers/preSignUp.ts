/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { PreSignUpTriggerEvent } from "aws-lambda";
import { LoggerServiceInterface } from "@yac/core";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

export const handler = async (event: PreSignUpTriggerEvent): Promise<PreSignUpTriggerEvent> => {
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("preSignUp called", { event }, "preSignUp handler");

    event.response.autoConfirmUser = true;

    // token change

    return event;
  } catch (error: unknown) {
    loggerService.error("Catastrophic error in preSignUp handler", { error, event }, "preSignUp handler");

    throw error;
  }
};
