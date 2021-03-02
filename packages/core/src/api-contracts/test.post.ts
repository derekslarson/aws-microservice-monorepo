import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";

export const testMethod = ApiGatewayV2.HttpMethod.POST;

export interface TestRequestBody {
  message: string;
}

export interface TestResponseBody {
  messageId: string;
}
