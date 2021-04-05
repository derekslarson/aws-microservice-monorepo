import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export type SignUpMethod = HttpMethod.POST;

export type SignUpPath = "/sign-up";

export interface SignUpRequestBody {
  email: string;
}

export interface SignUpResponseBody {
  session: string;
}
