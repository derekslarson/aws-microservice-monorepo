import "reflect-metadata";
import { generateInternalServerErrorResponse, LoggerServiceInterface } from "@yac/util";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { OrganizationControllerInterface } from "../controllers/organization.controller";

const organizationController = container.get<OrganizationControllerInterface>(TYPES.OrganizationControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("removeUserFromOrganization called", { event }, "removeUserFromOrganization handler");

    const response = await organizationController.removeUserFromOrganization(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in removeUserFromOrganization handler", { error, event }, "removeUserFromOrganization handler");

    return generateInternalServerErrorResponse(error);
  }
};
