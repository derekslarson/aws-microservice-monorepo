/* eslint-disable no-underscore-dangle */
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as CDK from "@aws-cdk/core";
import * as IAM from "@aws-cdk/aws-iam";
import { WebSocketIntegration } from "./websocketApi.integration.construct";
import { WebSocketRouteIntegrationConfig } from "./lambdaWebSocketIntegration.construct";

export class WebSocketApi extends ApiGatewayV2.WebSocketApi {
  constructor(scope: CDK.Construct, id: string, props: ApiGatewayV2.WebSocketApiProps) {
    super(scope, id, props);
  }

  public _addIntegration(scope: CDK.Construct, config: WebSocketRouteIntegrationConfig): ApiGatewayV2.WebSocketIntegration {
    const { configHash, integration: existingIntegration } = this._integrationCache.getIntegration(scope, config);

    if (existingIntegration) {
      return existingIntegration as ApiGatewayV2.WebSocketIntegration;
    }

    const policy = new IAM.PolicyStatement({
      effect: IAM.Effect.ALLOW,
      resources: [
        config.handlerArn,
      ],
      actions: [ "lambda:InvokeFunction" ],
    });

    const role = new IAM.Role(this, `Role-${configHash}`, { assumedBy: new IAM.ServicePrincipal("apigateway.amazonaws.com") });

    role.addToPolicy(policy);

    const integration = new WebSocketIntegration(scope, `WebSocketIntegration-${configHash}`, {
      webSocketApi: this,
      integrationType: config.type,
      integrationUri: config.uri,
      credentialsArn: role.roleArn,
    });

    this._integrationCache.saveIntegration(scope, config, integration);

    return integration;
  }
}
