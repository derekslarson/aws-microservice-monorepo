import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController } from "@yac/util/src/controllers/base.controller";
import { ValidationServiceV2Interface } from "@yac/util/src/services/validation.service.v2";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { ForbiddenError } from "@yac/util/src/errors/forbidden.error";
import { Request } from "@yac/util/src/models/http/request.model";
import { Response } from "@yac/util/src/models/http/response.model";
import { BadRequestError } from "@yac/util/src/errors/badRequest.error";
import { OrganizationId } from "@yac/util/src/types/organizationId.type";
import { TYPES } from "../inversion-of-control/types";
import { GetBillingPortalUrlDto } from "../dtos/getBillingPortalUrl.dto";
import { OrganizationServiceInterface } from "../services/tier-1/organization.service";
import { BillingServiceInterface } from "../services/tier-1/billing.service";

@injectable()
export class BillingController extends BaseController implements BillingControllerInterface {
  constructor(
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.OrganizationServiceInterface) private organizationService: OrganizationServiceInterface,
    @inject(TYPES.BillingServiceInterface) private billingService: BillingServiceInterface,
  ) {
    super();
  }

  public async getBillingPortalUrl(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("getBillingPortalUrl called", { request }, this.constructor.name);

      const {
        jwtId,
        pathParameters: { organizationId },
        queryStringParameters: { return_url: returnUrl },
      } = this.validationService.validate({ dto: GetBillingPortalUrlDto, request, getUserIdFromJwt: true });

      const { isOrganizationAdmin } = await this.organizationService.isOrganizationAdmin({ userId: jwtId, organizationId: organizationId as OrganizationId });

      if (!isOrganizationAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { billingPortalUrl } = await this.billingService.getBillingPortalUrl({ organizationId: organizationId as OrganizationId, returnUrl });

      return this.generateSuccessResponse({ billingPortalUrl });
    } catch (error: unknown) {
      this.loggerService.error("Error in getBillingPortalUrl", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async handleStripeWebhook(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("handleStripeWebhookEvent called", { request }, this.constructor.name);

      const { body, headers: { "stripe-signature": stripeSignature } } = request;

      if (!body || !stripeSignature) {
        throw new BadRequestError("Bad Request");
      }

      await this.billingService.handleStripeWebhook({ body, stripeSignature });

      return this.generateSuccessResponse({});
    } catch (error: unknown) {
      this.loggerService.error("Error in handleStripeWebhookEvent", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface BillingControllerInterface {
  getBillingPortalUrl(request: Request): Promise<Response>;
  handleStripeWebhook(request: Request): Promise<Response>;
}
