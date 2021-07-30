/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { CreateAuthChallengeTriggerEvent } from "aws-lambda";
import { LoggerServiceInterface } from "@yac/util";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

export const handler = async (event: CreateAuthChallengeTriggerEvent): Promise<CreateAuthChallengeTriggerEvent> => {
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("createAuthChallenge called", { event }, "createAuthChallenge handler");

    // This is sent back to the client app
    event.response.publicChallengeParameters = { email: event.request.userAttributes.email };

    // Add the secret login code to the private challenge parameters
    // so it can be verified by the "Verify Auth Challenge Response" trigger
    event.response.privateChallengeParameters = { challenge: event.request.userAttributes["custom:authChallenge"] };

    return event;
  } catch (error: unknown) {
    loggerService.error("Catastrophic error in createAuthChallenge handler", { error, event }, "createAuthChallenge handler");

    throw error;
  }
};
