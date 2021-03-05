import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";

export const deleteClientMethod = ApiGatewayV2.HttpMethod.DELETE;

export const deleteClientPath = "/clients/{id}";

export type DeleteClientIdPathParameter = string;

export interface DeleteClientRequestHeaders {
  secret: string;
}

export interface DeleteClientResponseBody {
  message: string;
}
