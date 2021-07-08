/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { PostConfirmationConfirmSignUpTriggerEvent } from "aws-lambda";
import { LoggerServiceInterface, UserSignedUpSnsServiceInterface } from "@yac/core";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);
const userSignedUpSnsService = container.get<UserSignedUpSnsServiceInterface>(TYPES.UserSignedUpSnsServiceInterface);

export const handler = async (event: PostConfirmationConfirmSignUpTriggerEvent): Promise<PostConfirmationConfirmSignUpTriggerEvent> => {
  try {
    loggerService.trace("postCOnfirmation called", { event }, "postCOnfirmation handler");

    const { sub, email } = event.request.userAttributes;

    await userSignedUpSnsService.sendMessage({ id: sub, email });

    return event;
  } catch (error: unknown) {
    loggerService.error("Catastrophic error in postCOnfirmation handler", { error, event }, "postCOnfirmation handler");

    throw error;
  }
};
