import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as IAM from "@aws-cdk/aws-iam";

export interface WebsocketApiProps {
  connectHandler?: Lambda.Function;
  disconnectHandler?: Lambda.Function;
}

export class WebSocketApi extends CDK.Construct {
  public api: ApiGatewayV2.CfnApi;

  public endpoint: string;

  public executeWebsocketApiPolicyStatement: IAM.PolicyStatement;

  constructor(scope: CDK.Stack, id: string, props: WebsocketApiProps) {
    super(scope, id);

    const stage = "websocket";

    this.api = new ApiGatewayV2.CfnApi(this, id, {
      name: id,
      protocolType: "WEBSOCKET",
      routeSelectionExpression: "$request.body.action",
    });

    const websocketApiArn = scope.formatArn({
      service: "execute-api",
      resource: this.api.ref,
      sep: "/",
      resourceName: `${stage}/POST/*`,
    });

    // Policy Statements
    this.executeWebsocketApiPolicyStatement = new IAM.PolicyStatement({
      actions: [
        "execute-api:ManageConnections",
      ],
      resources: [ websocketApiArn ],
      effect: IAM.Effect.ALLOW,
    });

    const routes: ApiGatewayV2.CfnRoute[] = [];

    if (props.connectHandler) {
      const route = this.addRoute(`ConnnectRoute_${id}`, { handler: props.connectHandler, routeKey: "$connect" });
      routes.push(route);
    }

    if (props.disconnectHandler) {
      const route = this.addRoute(`ConnnectRoute_${id}`, { handler: props.disconnectHandler, routeKey: "$disconnect" });
      routes.push(route);
    }

    const deployment = new ApiGatewayV2.CfnDeployment(this, `WebSocketDeployment_${id}`, { apiId: this.api.ref });

    // eslint-disable-next-line no-new
    new ApiGatewayV2.CfnStage(this, `WebSocketStage_${id}`, {
      apiId: this.api.ref,
      autoDeploy: true,
      deploymentId: deployment.ref,
      stageName: stage,
    });

    this.endpoint = `${this.api.ref}.execute-api.${scope.region}.amazonaws.com/${stage}`;

    const dependencies = new CDK.ConcreteDependable();
    routes.forEach((route) => dependencies.add(route));
    deployment.node.addDependency(dependencies);
  }

  public addRoute(id: string, props: AddRouteInput): ApiGatewayV2.CfnRoute {
    const routeName = props.routeKey.replace("$", "");

    // access role for the socket api to access the socket lambda
    const policy = new IAM.PolicyStatement({
      effect: IAM.Effect.ALLOW,
      resources: [
        props.handler.functionArn,
      ],
      actions: [ "lambda:InvokeFunction" ],
    });

    const role = new IAM.Role(this, `${routeName}IntegrationRole_${id}`, { assumedBy: new IAM.ServicePrincipal("apigateway.amazonaws.com") });

    role.addToPolicy(policy);

    // lambda integration
    const integration = new ApiGatewayV2.CfnIntegration(this, `${routeName}LambdaIntegration_${id}`, {
      apiId: this.api.ref,
      integrationType: "AWS_PROXY",
      integrationUri: `arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${props.handler.functionArn}/invocations`,
      credentialsArn: role.roleArn,
    });

    return new ApiGatewayV2.CfnRoute(this, `${routeName}Route_${id}`, {
      apiId: this.api.ref,
      routeKey: props.routeKey,
      authorizationType: "NONE",
      target: `integrations/${integration.ref}`,
    });
  }
}

export interface AddRouteInput {
  routeKey: string;
  handler: Lambda.Function;
}
