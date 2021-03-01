import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";

export const triggerSnsMethod = ApiGatewayV2.HttpMethod.POST;

export const triggerSnsPath = "/trigger-sns";

export interface TriggerSnsRequestBody {
  message: string;
}

export interface TriggerSnsResponseBody {
  messageId: string;
}
