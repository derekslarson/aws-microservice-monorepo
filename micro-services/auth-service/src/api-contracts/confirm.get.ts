import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export type ConfirmMethod = HttpMethod.POST;

export type ConfirmPath = "/confirm";

export interface ConfirmationRequestBody {
  email: string;
  confirmationCode: string;
  clientId: string;
  session: string;
  redirectUri: string;
}

export interface ConfirmationRequestHeaders {
  "xsrf-token": string;
}

export interface ConfirmationResponseBody {
  authorizationCode: string;
}
