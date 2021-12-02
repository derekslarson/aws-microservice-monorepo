import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseController, ForbiddenError, LoggerServiceInterface, OrganizationId, Request, Response, ValidationServiceV2Interface } from "@yac/util";
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
      } = this.validationService.validate({ dto: GetBillingPortalUrlDto, request, getUserIdFromJwt: true });

      const { isOrganizationAdmin } = await this.organizationService.isOrganizationAdmin({ userId: jwtId, organizationId: organizationId as OrganizationId });

      if (!isOrganizationAdmin) {
        throw new ForbiddenError("Forbidden");
      }

      const { billingPortalUrl } = await this.billingService.getBillingPortalUrl({ organizationId: organizationId as OrganizationId });

      return this.generateSuccessResponse({ billingPortalUrl });
    } catch (error: unknown) {
      this.loggerService.error("Error in getBillingPortalUrl", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  // public async handleStripeWebhookEvent(request: Request): Promise<Response> {
  //   try {
  //     this.loggerService.trace("handleStripeWebhookEvent called", { request }, this.constructor.name);

  //     const {
  //       jwtId,
  //       pathParameters: { userId },
  //     } = this.validationService.validate({ dto: GetGoogleEventsDto, request, getUserIdFromJwt: true });

  //     if (jwtId !== userId) {
  //       throw new ForbiddenError("Forbidden");
  //     }

  //     const { events } = await this.googleStripeService.getEvents({ userId: userId as UserId });

  //     return this.generateSuccessResponse({ events });
  //   } catch (error: unknown) {
  //     this.loggerService.error("Error in handleStripeWebhookEvent", { error, request }, this.constructor.name);

  //     return this.generateErrorResponse(error);
  //   }
  // }
}

export interface BillingControllerInterface {
  getBillingPortalUrl(request: Request): Promise<Response>;
  // handleStripeWebhookEvent(request: Request): Promise<Response>;
}
