import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export type LoginMethod = HttpMethod.POST;

export type LoginPath = "/login";

export interface LoginRequestBody {
  email: string;
  clientId: string;
}

export interface LoginResponseBody {
  session: string;
}
