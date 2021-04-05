import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export type CreateClientMethod = HttpMethod.POST;

export type CreateClientPath = "/oauth2/clients";

export interface CreateClientRequestBody {
  name: string;
  redirectUri: string;
  scopes: string[];
}

export interface CreateClientResponseBody {
  clientId: string;
  clientSecret: string;
}
