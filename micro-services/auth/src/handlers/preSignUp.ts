/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { PreSignUpTriggerEvent } from "aws-lambda";
import { LoggerServiceInterface } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

export const handler = async (event: PreSignUpTriggerEvent): Promise<PreSignUpTriggerEvent> => {
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("preSignUp called", { event }, "preSignUp handler");

    if (event.request.userAttributes.email) {
      event.response.autoVerifyEmail = true;
    }

    if (event.request.userAttributes.phone_number) {
      event.response.autoVerifyPhone = true;
    }

    event.response.autoConfirmUser = true;

    return event;
  } catch (error: unknown) {
    loggerService.error("Catastrophic error in preSignUp handler", { error, event }, "preSignUp handler");

    throw error;
  }
};
