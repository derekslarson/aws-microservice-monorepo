import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export type MediaPushMethod = HttpMethod.POST;

export type MediaPushEndpoint = "/{folder}/{messageId}/thumbnail";

export interface MediaPushQueryParameters {
  token: string
}

export interface MediaPushPathParameters {
  messageId: string,
  folder: "user" | "group"
}
