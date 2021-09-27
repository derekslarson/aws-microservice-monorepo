/* eslint-disable no-new */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-underscore-dangle */
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as CDK from "@aws-cdk/core";
import * as IAM from "@aws-cdk/aws-iam";
import { WebSocketIntegration } from "./webSocketIntegration.construct";
import { WebSocketRouteIntegrationConfig } from "../aws-apigatewayv2-integrations/lambdaWebSocketIntegration.construct";

interface DomainMappingOptions extends ApiGatewayV2.DomainMappingOptions {
  mappingKey: string;
}

export interface WebSocketApiProps extends ApiGatewayV2.WebSocketApiProps {
  defaultDomainMapping?: DomainMappingOptions;
}

export class WebSocketApi extends ApiGatewayV2.WebSocketApi {
  public endpoint: string;

  public apiArn: string;

  constructor(scope: CDK.Construct, id: string, props: WebSocketApiProps) {
    super(scope, id, props);

    const stageName = "$default";

    const stage = new ApiGatewayV2.WebSocketStage(this, `WebSocketApiStage_${id}`, {
      webSocketApi: this,
      stageName,
      autoDeploy: true,
      domainMapping: props.defaultDomainMapping,
    });

    this.apiArn = this.stack.formatArn({
      service: "execute-api",
      resource: this.apiId,
      sep: "/",
      resourceName: `${stageName}/POST/*`,
    });

    this.endpoint = props.defaultDomainMapping ? `${props.defaultDomainMapping.domainName.name}/${props.defaultDomainMapping.mappingKey}` : stage.url;
  }

  public override _addIntegration(scope: CDK.Construct, config: WebSocketRouteIntegrationConfig): ApiGatewayV2.WebSocketIntegration {
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
