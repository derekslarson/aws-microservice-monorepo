import "reflect-metadata";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { generateInternalServerErrorResponse } from "@yac/util/src/util/internalServerError.response.generator";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { GroupControllerInterface } from "../controllers/group.controller";

const groupController = container.get<GroupControllerInterface>(TYPES.GroupControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("getGroupsByOrganizationId called", { event }, "getGroupsByOrganizationId handler");

    const response = await groupController.getGroupsByOrganizationId(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in getGroupsByOrganizationId handler", { error, event }, "getGroupsByOrganizationId handler");

    return generateInternalServerErrorResponse(error);
  }
};
