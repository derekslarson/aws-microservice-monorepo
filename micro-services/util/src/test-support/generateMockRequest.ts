import { Request } from "../models/http/request.model";
import { UserId } from "../types";

export function generateMockRequest(overrideParams: Partial<Request> = {}, jwtUserId?: UserId): Request {
  return {

    version: "mock-version",
    routeKey: "mock-route-key",
    rawPath: "mock-raw-path",
    rawQueryString: "mock-raw-query-string",
    cookies: [ "mock=cookie" ],
    headers: { "mock-header": "header-mock" },
    queryStringParameters: { mockQueryParam: "mock-query-param" },
    requestContext: {
      accountId: "mock-account-id",
      apiId: "mock-api-id",
      authorizer: jwtUserId ? {
        lambda: {
          userId: jwtUserId,
          scope: "mock-scope",
        },
      } : undefined,
      domainName: "mock-domain-name",
      domainPrefix: "mock-domain-prefix",
      http: {
        method: "mock-method",
        path: "mock-path",
        protocol: "mock-protocol",
        sourceIp: "mock-source-ip",
        userAgent: "mock-user-agent",
      },
      requestId: "mock-request-id",
      routeKey: "mock-request-context-route-key",
      stage: "mock-stage",
      time: "mock-time",
      timeEpoch: 1,
    },
    body: '{ "mockBody": "mock-body" }',
    pathParameters: { mockPathParams: "mock-path-params" },
    isBase64Encoded: false,
    stageVariables: { mockStageVariables: "mock-stage-variables" },
    ...overrideParams,
  };
}
