import "reflect-metadata";
import { generateInternalServerErrorResponse, LoggerServiceInterface } from "@yac/util";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { CalendarControllerInterface } from "../controllers/calendar.controller";

const calendarController = container.get<CalendarControllerInterface>(TYPES.CalendarControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("getGoogleAccess called", { event }, "getGoogleAccess handler");

    const response = await calendarController.getGoogleAccess(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in getGoogleAccess handler", { error, event }, "getGoogleAccess handler");

    return generateInternalServerErrorResponse(error);
  }
};
