import "reflect-metadata";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { TokenServiceInterface } from "../services/tier-1/token.service";

const tokenService = container.get<TokenServiceInterface>(TYPES.TokenServiceInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: unknown): Promise<void> => {
  try {
    loggerService.trace("rotateJwks called", { event }, "rotateJwks handler");

    await tokenService.rotateJwks();
  } catch (error: unknown) {
    loggerService.error("Error in rotateJwks handler", { error, event }, "rotateJwks handler");
  }
};
