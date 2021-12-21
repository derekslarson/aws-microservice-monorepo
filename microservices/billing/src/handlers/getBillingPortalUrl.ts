import "reflect-metadata";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { generateInternalServerErrorResponse } from "@yac/util/src/util/internalServerError.response.generator";
import { container } from "../inversion-of-control/container";
import { TYPES } from "../inversion-of-control/types";
import { BillingControllerInterface } from "../controllers/billing.controller";

const billingController = container.get<BillingControllerInterface>(TYPES.BillingControllerInterface);
const loggerService = container.get<LoggerServiceInterface>(TYPES.LoggerServiceInterface);

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    loggerService.trace("getBillingPortalUrl called", { event }, "getBillingPortalUrl handler");

    const response = await billingController.getBillingPortalUrl(event);

    return response;
  } catch (error: unknown) {
    // We should never get here, as Controller classes should never throw, but if for some reason we do, we need to log it
    loggerService.error("Catastrophic error in getBillingPortalUrl handler", { error, event }, "getBillingPortalUrl handler");

    return generateInternalServerErrorResponse(error);
  }
};
