import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";

export const loginMethod = ApiGatewayV2.HttpMethod.POST;

export const loginPath = "/login";

export interface LoginRequestBody {
  email: string;
  clientId: string;
}

export interface LoginResponseBody {
  session: string;
}
