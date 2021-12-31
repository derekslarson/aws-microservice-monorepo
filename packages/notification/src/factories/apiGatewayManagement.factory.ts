import ApiGatewayManagementApi from "aws-sdk/clients/apigatewaymanagementapi";

export type ApiGatewayManagementFactory = (endpoint: string) => ApiGatewayManagementApi;

export const apiGatewayManagementFactory: ApiGatewayManagementFactory = (endpoint: string): ApiGatewayManagementApi => new ApiGatewayManagementApi({
  apiVersion: "2018-11-29",
  endpoint,
});
