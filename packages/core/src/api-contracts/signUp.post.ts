import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";

export const signUpMethod = ApiGatewayV2.HttpMethod.POST;

export const signUpPath = "/sign-up";

export interface SignUpRequestBody {
  email: string;
}

export interface SignUpResponseBody {
  message: string;
}
