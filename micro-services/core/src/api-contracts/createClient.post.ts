import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";

export const createClientMethod = ApiGatewayV2.HttpMethod.POST;

export const createClientPath = "/clients";

export interface CreateClientRequestBody {
  name: string;
  redirectUri: string;
  scopes: string[];
}

export interface CreateClientResponseBody {
  clientId: string;
  clientSecret: string;
}
