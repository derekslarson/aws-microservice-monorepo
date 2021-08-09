import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as ApiGatewayV2Integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as CDK from "@aws-cdk/core";
import * as IAM from "@aws-cdk/aws-iam";

export interface WebSocketRouteIntegrationConfig extends ApiGatewayV2.WebSocketRouteIntegrationConfig {
  handlerArn: string;
}

export class LambdaWebSocketIntegration implements ApiGatewayV2.IWebSocketRouteIntegration {
  constructor(private props: ApiGatewayV2Integrations.LambdaWebSocketIntegrationProps) {}

  public bind(options: ApiGatewayV2.WebSocketRouteIntegrationBindOptions): WebSocketRouteIntegrationConfig {
    const { route } = options;
    this.props.handler.addPermission(`${CDK.Names.nodeUniqueId(route.node)}-Permission`, {
      scope: options.scope,
      principal: new IAM.ServicePrincipal("apigateway.amazonaws.com"),
      sourceArn: CDK.Stack.of(route).formatArn({
        service: "execute-api",
        resource: route.webSocketApi.apiId,
        resourceName: `*/*${route.routeKey}`,
      }),
    });

    const integrationUri = CDK.Stack.of(route).formatArn({
      service: "apigateway",
      account: "lambda",
      resource: "path/2015-03-31/functions",
      resourceName: `${this.props.handler.functionArn}/invocations`,
    });

    return {
      type: ApiGatewayV2.WebSocketListenerType.AWS_PROXY,
      uri: integrationUri,
      handlerArn: this.props.handler.functionArn,
    };
  }
}
