/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/require-await */
import "reflect-metadata";
import { VerifyAuthChallengeResponseTriggerEvent } from "aws-lambda";
import { LoggerServiceInterface } from "@yac/core";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

export const handler = async (event: VerifyAuthChallengeResponseTriggerEvent): Promise<VerifyAuthChallengeResponseTriggerEvent> => {
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("verifyAuthChallengeResponse called", { event }, "verifyAuthChallengeResponse handler");

    const LINK_TIMEOUT = 30 * 60; // number of seconds the magic link should be valid

    // Get challenge and timestamp from user attributes
    const [ authChallenge, timestamp ] = (event.request.privateChallengeParameters.challenge || "").split(",");

    loggerService.info("params", { answer: event.request.challengeAnswer, authChallenge }, "verifyAuthChallengeResponse handler");

    // 1. Check if code is equal to what we expect...
    if (event.request.challengeAnswer === authChallenge) {
      // 2. And whether the link hasn't timed out...
      if (Number(timestamp) > (new Date()).valueOf() / 1000 - LINK_TIMEOUT) {
        event.response.answerCorrect = true;
        return event;
      }
    }

    // Fallback
    event.response.answerCorrect = false;

    return event;
  } catch (error: unknown) {
    loggerService.error("Catastrophic error in verifyAuthChallengeResponse handler", { error, event }, "verifyAuthChallengeResponse handler");

    throw error;
  }
};
