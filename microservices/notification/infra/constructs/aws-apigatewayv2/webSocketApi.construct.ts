/* eslint-disable no-new */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-underscore-dangle */
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as IAM from "@aws-cdk/aws-iam";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { WebSocketIntegration } from "./webSocketIntegration.construct";
import { WebSocketRouteIntegrationConfig } from "../aws-apigatewayv2-integrations/lambdaWebSocketIntegration.construct";

interface DomainMappingOptions extends ApiGatewayV2.DomainMappingOptions {
  mappingKey: string;
}

export interface WebSocketApiProps extends ApiGatewayV2.WebSocketApiProps {
  defaultDomainMapping?: DomainMappingOptions;
  addAuthorizer?: boolean;
}

export class WebSocketApi extends ApiGatewayV2.WebSocketApi {
  public endpoint: string;

  public apiArn: string;

  constructor(scope: CDK.Construct, id: string, props: WebSocketApiProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;
    const ExportNames = generateExportNames(environment === Environment.Local ? developer : environment);

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

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

    if (props.addAuthorizer ?? true) {
      const authorizerHandler = Lambda.Function.fromFunctionArn(this, `AuthorizerHandler_${id}`, CDK.Fn.importValue(ExportNames.AuthorizerHandlerFunctionArn));

      const authorizer = this.createLambdaAuthorizer(id, authorizerHandler, "token");

      const connectRoute = this.node.findChild("$connect-Route").node.defaultChild as ApiGatewayV2.CfnRoute;
      connectRoute.authorizationType = "CUSTOM";
      connectRoute.authorizerId = authorizer.ref;
    }
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

  private createLambdaAuthorizer(id: string, handler: Lambda.IFunction, tokenKey: string): ApiGatewayV2.CfnAuthorizer {
    const authorizer = new ApiGatewayV2.CfnAuthorizer(this, `WebSocketAuthorizer_${id}`, {
      apiId: this.apiId,
      authorizerType: "REQUEST",
      identitySource: [ `route.request.querystring.${tokenKey}` ],
      name: `WebSocketAuthorizer_${id}`,
      authorizerUri: this.integrationUri(handler),
    });

    // See https://github.com/aws/aws-cdk/issues/7588
    new Lambda.CfnPermission(this, `WebSocketApiAuthorizerPermission_${id}`, {
      action: "lambda:InvokeFunction",
      principal: "apigateway.amazonaws.com",
      functionName: handler.functionName,
      sourceArn: CDK.Stack.of(this).formatArn({
        service: "execute-api",
        resource: this.apiId,
        resourceName: "authorizers/*",
      }),
    });

    return authorizer;
  }

  private integrationUri(handler: Lambda.IFunction): string {
    const path = [ "2015-03-31", "functions", handler.functionArn, "invocations" ].join("/");

    return CDK.Stack.of(this).formatArn({
      service: "apigateway",
      account: "lambda",
      resource: "path",
      resourceName: path,
    });
  }
}
