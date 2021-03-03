import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";

export const confirmMethod = ApiGatewayV2.HttpMethod.GET;

export const confirmPath = "/confirm";

export interface ConfirmationRequestQueryParameters {
  email: string;
  confirmationCode: string;
}

export interface ConfirmationResponseBody {
  message: string;
}
