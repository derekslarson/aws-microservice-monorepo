import "reflect-metadata";
import { generateInternalServerErrorResponse, LoggerServiceInterface } from "@yac/util";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { TeamControllerInterface } from "../controllers/team.controller";

const teamController = container.get<TeamControllerInterface>(TYPES.TeamControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("getTeamsByOrganizationId called", { event }, "getTeamsByOrganizationId handler");

    const response = await teamController.getTeamsByOrganizationId(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in getTeamsByOrganizationId handler", { error, event }, "getTeamsByOrganizationId handler");

    return generateInternalServerErrorResponse(error);
  }
};
