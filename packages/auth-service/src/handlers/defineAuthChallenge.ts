/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { DefineAuthChallengeTriggerEvent } from "aws-lambda";
import { LoggerServiceInterface } from "@yac/core/dist/src/services/logger.service";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

export const handler = async (event: DefineAuthChallengeTriggerEvent): Promise<DefineAuthChallengeTriggerEvent> => {
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("defineAuthChallenge called", { event }, "defineAuthChallenge handler");

    // Stop if user can't be found
    if (event.request.userNotFound) {
      event.response.failAuthentication = true;
      event.response.issueTokens = false;

      return event;
    }

    // Check result of last challenge
    if (event.request.session && event.request.session.length && event.request.session.slice(-1)[0].challengeResult === true) {
      // The user provided the right answer - issue their tokens
      event.response.failAuthentication = false;
      event.response.issueTokens = true;

      return event;
    }

    // Present a new challenge if we haven't received a correct answer yet
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = "CUSTOM_CHALLENGE";

    return event;
  } catch (error: unknown) {
    loggerService.error("Catastrophic error in defineAuthChallenge handler", { error, event }, "defineAuthChallenge handler");

    throw error;
  }
};
