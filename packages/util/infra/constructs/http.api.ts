/* eslint-disable no-new */
/* eslint-disable no-console */
import {
  Duration,
  Stack,
  aws_lambda as Lambda,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as ApiGatewayV2Authorizers from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as ApiGatewayV2Integrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";

export class HttpApi extends ApiGatewayV2.HttpApi {
  public addRoute(handler: Lambda.IFunction, method: ApiGatewayV2.HttpMethod, path: string): void {
    new ApiGatewayV2.HttpRoute(this, `${method}${path}`, {
      httpApi: this,
      routeKey: ApiGatewayV2.HttpRouteKey.with(path, method),
      integration: new ApiGatewayV2Integrations.HttpLambdaIntegration(`${method}${path}LambdaIntegration`, handler),
    });
  }
}

interface HttpApiProps extends ApiGatewayV2.HttpApiProps {
  serviceName: string;
  domainName: ApiGatewayV2.IDomainName,
  corsAllowedOrigins?: string[];
  authorizerHandler?: Lambda.IFunction;
}

export interface RouteProps<T extends string = string, U extends ApiGatewayV2.HttpMethod = ApiGatewayV2.HttpMethod> {
  path: T;
  method: U;
  handler: Lambda.IFunction;
  restricted?: boolean;
}

export interface ProxyRouteProps {
  path: string;
  method: ApiGatewayV2.HttpMethod;
  proxyUrl: string;
  restricted?: boolean;
}

export interface AddAuthorizerProps {
  authorizerHandler: Lambda.IFunction;
}
