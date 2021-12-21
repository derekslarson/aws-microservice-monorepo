import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as CDK from "@aws-cdk/core";

export interface WebSocketIntegrationProps extends ApiGatewayV2.WebSocketIntegrationProps {
  readonly credentialsArn: string;
}

export class WebSocketIntegration extends CDK.Resource implements ApiGatewayV2.IWebSocketIntegration {
  public readonly integrationId: string;

  public readonly webSocketApi: ApiGatewayV2.IWebSocketApi;

  constructor(scope: CDK.Construct, id: string, props: WebSocketIntegrationProps) {
    super(scope, id);
    const integ = new ApiGatewayV2.CfnIntegration(this, "Resource", {
      apiId: props.webSocketApi.apiId,
      integrationType: props.integrationType,
      integrationUri: props.integrationUri,
      credentialsArn: props.credentialsArn,
    });

    this.integrationId = integ.ref;
    this.webSocketApi = props.webSocketApi;
  }
}
