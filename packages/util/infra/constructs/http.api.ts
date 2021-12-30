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
  public readonly apiUrl: string;

  private authorizer?: ApiGatewayV2Authorizers.HttpLambdaAuthorizer;

  constructor(scope: Construct, id: string, props: HttpApiProps) {
    const { domainName, serviceName, authorizerHandler } = props;

    super(scope, id, {
      apiName: id,
      ...props,
      defaultDomainMapping: {
        domainName,
        mappingKey: serviceName,
      },
      corsPreflight: props.corsPreflight || {
        allowOrigins: [ "*" ],
        allowMethods: [ ApiGatewayV2.CorsHttpMethod.ANY ],
        allowHeaders: [ "*" ],
        exposeHeaders: [ "*" ],
        maxAge: Duration.hours(1),
      },
    });

    if (authorizerHandler) {
      this.addAuthorizer(scope, id, { authorizerHandler });
    }

    this.apiUrl = `https://${domainName.name}/${serviceName}`;
  }

  public addRoute(props: RouteProps): void {
    try {
      const { restricted, handler, method, path } = props;

      if (restricted && !this.authorizer) {
        throw Error("'restricted' not allowed in HttpApi without an authorizer");
      }

      new ApiGatewayV2.HttpRoute(this, `${method}${path}`, {
        httpApi: this,
        routeKey: ApiGatewayV2.HttpRouteKey.with(path, method),
        integration: new ApiGatewayV2Integrations.HttpLambdaIntegration(`${method}${path}LambdaIntegration`, handler),
        authorizer: restricted ? this.authorizer : undefined,
      });
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in HttpApi.addRoute:\n`, error);

      throw error;
    }
  }

  public addProxyRoute(props: ProxyRouteProps): void {
    try {
      const { restricted, proxyUrl, method, path } = props;

      if (restricted && !this.authorizer) {
        throw Error("'restricted' not allowed in HttpApi without an authorizer");
      }

      new ApiGatewayV2.HttpRoute(this, `${method}${path}Route`, {
        httpApi: this,
        routeKey: ApiGatewayV2.HttpRouteKey.with(path, method),
        integration: new ApiGatewayV2Integrations.HttpUrlIntegration(`${method}${path}UrlIntegration`, proxyUrl, { method }),
        authorizer: restricted ? this.authorizer : undefined,
      });
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in HttpApi.addProxyRoute:\n`, error);

      throw error;
    }
  }

  public addAuthorizer(scope: Construct, id: string, props: AddAuthorizerProps): void {
    try {
      if (this.authorizer) {
        throw new Error("HttpApi already has an authorizer");
      }

      // This should be handled by this.authorizer.bind (used in the route declarations below)
      // but for some reason it isn't working as expected.
      // See https://github.com/aws/aws-cdk/issues/7588
      new Lambda.CfnPermission(this, `HttpApiAuthorizerPermission_${id}`, {
        action: "lambda:InvokeFunction",
        principal: "apigateway.amazonaws.com",
        functionName: props.authorizerHandler.functionName,
        sourceArn: Stack.of(scope).formatArn({
          service: "execute-api",
          resource: this.apiId,
          resourceName: "authorizers/*",
        }),
      });

      this.authorizer = new ApiGatewayV2Authorizers.HttpLambdaAuthorizer(`HttpLambdaAuthorizer_${id}`, props.authorizerHandler, {
        resultsCacheTtl: Duration.minutes(10),
        responseTypes: [ ApiGatewayV2Authorizers.HttpLambdaResponseType.IAM ],
      });
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in HttpApi.addAuthorizer:\n`, error);

      throw error;
    }
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
