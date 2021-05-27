import { Request } from "../models/http/request.model";

export function generateMockRequest(overrideParams: Partial<Request> = {}): Request {
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
      authorizer: {
        jwt: {
          claims: { mockClaim: "mock-claim" },
          scopes: [ "mock-scope" ],
        },
      },
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
