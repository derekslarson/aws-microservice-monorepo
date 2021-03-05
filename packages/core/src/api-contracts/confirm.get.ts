import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";

export const confirmMethod = ApiGatewayV2.HttpMethod.POST;

export const confirmPath = "/confirm";

export interface ConfirmationRequestBody {
  email: string;
  confirmationCode: string;
  clientId: string;
  redirectUri: string;
  xsrfToken: string;
}

export interface ConfirmationResponseBody {
  authorizationCode: string;
}
