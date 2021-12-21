import { Record, String } from "runtypes";

export const GetBillingPortalUrlDto = Record({ pathParameters: Record({ organizationId: String }) });
