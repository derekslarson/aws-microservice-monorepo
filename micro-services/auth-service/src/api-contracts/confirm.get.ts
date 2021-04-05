import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export type ConfirmMethod = HttpMethod.POST;

export type ConfirmPath = "/confirm";

export interface ConfirmationRequestBody {
  email: string;
  confirmationCode: string;
  session: string;
  clientId: string;
  redirectUri: string;
}

export interface ConfirmationRequestCookies {
  "XSRF-TOKEN": string;
}

export interface ConfirmationResponseBody {
  authorizationCode: string;
}
