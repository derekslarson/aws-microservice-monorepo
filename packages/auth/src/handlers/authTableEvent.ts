import "reflect-metadata";
import { DynamoDBStreamEvent } from "aws-lambda";
import { DynamoStreamControllerInterface } from "@yac/util/src/controllers/dynamoStream.controller";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  const dynamoStreamController = container.get<DynamoStreamControllerInterface>(TYPES.DynamoStreamControllerInterface);
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("authTableEvent called", { event }, "authTableEvent handler");

    await dynamoStreamController.handleStreamEvent(event);
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in authTableEvent handler", { error, event }, "authTableEvent handler");
  }
};
