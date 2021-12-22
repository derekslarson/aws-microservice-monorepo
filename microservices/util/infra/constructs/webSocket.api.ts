/* eslint-disable no-new */
import {
  Stack,
  aws_lambda as Lambda,
  aws_apigatewayv2 as ApiGatewayV2Cfn,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";

interface DomainMappingOptions extends ApiGatewayV2.DomainMappingOptions {
  mappingKey: string;
}

export interface WebSocketApiProps extends ApiGatewayV2.WebSocketApiProps {
  defaultDomainMapping?: DomainMappingOptions;
  authorizerHandler?: Lambda.IFunction;
}

export class WebSocketApi extends ApiGatewayV2.WebSocketApi {
  public endpoint: string;

  public apiArn: string;

  constructor(scope: Construct, id: string, props: WebSocketApiProps) {
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
      resourceName: `${stageName}/POST/*`,
    });

    this.endpoint = props.defaultDomainMapping ? `${props.defaultDomainMapping.domainName.name}/${props.defaultDomainMapping.mappingKey}` : stage.url;

    if (props.authorizerHandler) {
      const authorizer = this.createLambdaAuthorizer(id, props.authorizerHandler, "token");

      const connectRoute = this.node.findChild("$connect-Route").node.defaultChild as ApiGatewayV2Cfn.CfnRoute;
      connectRoute.authorizationType = "CUSTOM";
      connectRoute.authorizerId = authorizer.ref;
    }
  }

  private createLambdaAuthorizer(id: string, handler: Lambda.IFunction, tokenKey: string): ApiGatewayV2Cfn.CfnAuthorizer {
    const authorizer = new ApiGatewayV2Cfn.CfnAuthorizer(this, `WebSocketAuthorizer_${id}`, {
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
      sourceArn: Stack.of(this).formatArn({
        service: "execute-api",
        resource: this.apiId,
        resourceName: "authorizers/*",
      }),
    });

    return authorizer;
  }

  private integrationUri(handler: Lambda.IFunction): string {
    const path = [ "2015-03-31", "functions", handler.functionArn, "invocations" ].join("/");

    return Stack.of(this).formatArn({
      service: "apigateway",
      account: "lambda",
      resource: "path",
      resourceName: path,
    });
  }
}
