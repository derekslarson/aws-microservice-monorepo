import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export type DeleteClientMethod = HttpMethod.DELETE;

export type DeleteClientPath = `/clients/${string}`;

export type DeleteClientIdPathParameter = string;

export interface DeleteClientRequestHeaders {
  secret: string;
}

export interface DeleteClientResponseBody {
  message: string;
}
