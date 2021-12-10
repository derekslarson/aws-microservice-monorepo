import "reflect-metadata";
import { DynamoStreamControllerInterface, LoggerServiceInterface } from "@yac/util";
import { DynamoDBStreamEvent } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  const dynamoStreamController = container.get<DynamoStreamControllerInterface>(TYPES.DynamoStreamControllerInterface);
  const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

  try {
    loggerService.trace("billingTableEvent called", { event }, "billingTableEvent handler");

    await dynamoStreamController.handleStreamEvent(event);
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in billingTableEvent handler", { error, event }, "billingTableEvent handler");
  }
};
