import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export type MediaRetrieveMethod = HttpMethod.GET;

export type MediaRetrieveEndpoint = "/{folder}/{messageId}/thumbnail.gif";

export interface MediaRetrievePathParameters {
  messageId: string,
  folder: "user" | "group"
}

export interface MediaRetrieveQueryParameters {
  token: string
}
