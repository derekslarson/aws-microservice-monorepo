import "reflect-metadata";
import { generateInternalServerErrorResponse, LoggerServiceInterface } from "@yac/util";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { MeetingControllerInterface } from "../controllers/meeting.controller";

const meetingController = container.get<MeetingControllerInterface>(TYPES.MeetingControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("getMeetingsByOrganizationId called", { event }, "getMeetingsByOrganizationId handler");

    const response = await meetingController.getMeetingsByOrganizationId(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in getMeetingsByOrganizationId handler", { error, event }, "getMeetingsByOrganizationId handler");

    return generateInternalServerErrorResponse(error);
  }
};
