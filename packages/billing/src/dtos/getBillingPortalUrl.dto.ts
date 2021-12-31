import { Record, String } from "runtypes";

export const GetBillingPortalUrlDto = Record({
  pathParameters: Record({ organizationId: String }),
  queryStringParameters: Record({ return_url: String }),
});
