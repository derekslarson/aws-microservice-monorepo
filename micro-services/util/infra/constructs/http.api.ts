/* eslint-disable no-new */
/* eslint-disable no-console */
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as ApiGatewayV2Integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as ApiGatewayV2Authorizers from "@aws-cdk/aws-apigatewayv2-authorizers";
import { Duration } from "@aws-cdk/core";
import { Environment } from "../../src/enums/environment.enum";

export class HttpApi extends ApiGatewayV2.HttpApi {
  public readonly apiURL: string;

  private authorizer?: ApiGatewayV2Authorizers.HttpLambdaAuthorizer;

  constructor(scope: CDK.Construct, id: string, props: HttpApiProps) {
    const environment = scope.node.tryGetContext("environment") as string;

    super(scope, id, {
      ...props,
      defaultDomainMapping: {
        domainName: props.domainName,
        mappingKey: props.serviceName,
      },
      corsPreflight: {
        allowOrigins: props.corsAllowedOrigins || [ "*" ],
        allowMethods: [
          ApiGatewayV2.CorsHttpMethod.GET,
          ApiGatewayV2.CorsHttpMethod.POST,
          ApiGatewayV2.CorsHttpMethod.PUT,
          ApiGatewayV2.CorsHttpMethod.PATCH,
          ApiGatewayV2.CorsHttpMethod.DELETE,
          ApiGatewayV2.CorsHttpMethod.HEAD,
          ApiGatewayV2.CorsHttpMethod.OPTIONS,
        ],
        maxAge: environment !== Environment.Prod ? CDK.Duration.minutes(300) : CDK.Duration.minutes(60 * 12),
        allowCredentials: true,
      },
    });

    if (props.authorizerHandler) {
      this.addAuthorizer(scope, id, { authorizerHandler: props.authorizerHandler });
    }

    this.apiURL = `https://${props.domainName.name}/${props.serviceName}`;
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
        integration: new ApiGatewayV2Integrations.LambdaProxyIntegration({ handler }),
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

      new ApiGatewayV2.HttpRoute(this, `${method}${path}`, {
        httpApi: this,
        routeKey: ApiGatewayV2.HttpRouteKey.with(path, method),
        integration: new ApiGatewayV2Integrations.HttpProxyIntegration({ url: proxyUrl, method }),
        authorizer: restricted ? this.authorizer : undefined,
      });
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in HttpApi.addProxyRoute:\n`, error);

      throw error;
    }
  }

  public addAuthorizer(scope: CDK.Construct, id: string, props: AddAuthorizerProps): void {
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
        sourceArn: CDK.Stack.of(scope).formatArn({
          service: "execute-api",
          resource: this.apiId,
          resourceName: "authorizers/*",
        }),
      });

      this.authorizer = new ApiGatewayV2Authorizers.HttpLambdaAuthorizer({
        authorizerName: `LambdaAuthorizer_${id}`,
        handler: props.authorizerHandler,
        resultsCacheTtl: Duration.minutes(10),
        responseTypes: [ ApiGatewayV2Authorizers.HttpLambdaResponseType.SIMPLE ],
      });
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in HttpApi.addAuthorizer:\n`, error);

      throw error;
    }
  }
}

interface HttpApiProps extends ApiGatewayV2.HttpApiProps {
  serviceName: string
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
