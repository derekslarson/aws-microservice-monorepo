import "reflect-metadata";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { generateInternalServerErrorResponse } from "@yac/util/src/util/internalServerError.response.generator";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { UserControllerInterface } from "../controllers/user.controller";

const userController = container.get<UserControllerInterface>(TYPES.UserControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("getUsersByTeamId called", { event }, "getUsersByTeamId handler");

    const response = await userController.getUsersByTeamId(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in getUsersByTeamId handler", { error, event }, "getUsersByTeamId handler");

    return generateInternalServerErrorResponse(error);
  }
};
