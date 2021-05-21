/* eslint-disable no-new */
/* eslint-disable no-console */
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as ApiGatewayV2Integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import { Environment } from "../../src/enums/environment.enum";

interface HttpApiProps extends ApiGatewayV2.HttpApiProps {
  serviceName: string
  domainName: ApiGatewayV2.IDomainName,
  corsAllowedOrigins?: string[];
}

export interface RouteProps<T extends string = string, U extends ApiGatewayV2.HttpMethod = ApiGatewayV2.HttpMethod> {
  path: T;
  method: U;
  handler: Lambda.IFunction;
  authorizerType?: "JWT" | "AWS_IAM";
  authorizerId?: string;
  authorizationScopes?: string[];
}

export interface ProxyRouteProps {
  path: string;
  proxyUrl: string;
  method: ApiGatewayV2.HttpMethod;
  authorizerType?: "JWT" | "AWS_IAM";
  authorizerId?: string;
  authorizationScopes?: string[];
}

export class HttpApi extends ApiGatewayV2.HttpApi {
  public readonly apiURL: string;

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
          ApiGatewayV2.CorsHttpMethod.PATCH,
          ApiGatewayV2.CorsHttpMethod.DELETE,
          ApiGatewayV2.CorsHttpMethod.HEAD,
          ApiGatewayV2.CorsHttpMethod.OPTIONS,
        ],
        maxAge: environment !== Environment.Prod ? CDK.Duration.minutes(300) : CDK.Duration.minutes(60 * 12),
        allowCredentials: true,
      },
    });

    this.apiURL = `https://${props.domainName.name}/${props.serviceName}`;
  }

  public addRoute(props: RouteProps): void {
    try {
      const { authorizerType, authorizerId, authorizationScopes, handler, method, path } = props;

      if (authorizerType === "JWT" && authorizerId === undefined) {
        throw Error("JWT authorizer requires authorizerId");
      } else if (authorizerType === "AWS_IAM" && authorizerId !== undefined) {
        throw Error("IAM authorizer can not be configured with authorizerId");
      }

      const integration = new ApiGatewayV2Integrations.LambdaProxyIntegration({ handler });
      const route = new ApiGatewayV2.HttpRoute(this, `${method}${path}`, {
        httpApi: this,
        routeKey: ApiGatewayV2.HttpRouteKey.with(path, method),
        integration,
      });

      const routeCfn = route.node.defaultChild as ApiGatewayV2.CfnRoute;

      routeCfn.authorizationType = authorizerType;
      routeCfn.authorizerId = authorizerId;
      routeCfn.authorizationScopes = authorizationScopes;
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in HttpApi.addRoute:\n`, error);

      throw error;
    }
  }

  public addProxyRoute(props: ProxyRouteProps): void {
    const { authorizerType, authorizerId, authorizationScopes, proxyUrl, method, path } = props;

    if (authorizerType === "JWT" && authorizerId === undefined) {
      throw Error("JWT authorizer requires authorizerId");
    } else if (authorizerType === "AWS_IAM" && authorizerId !== undefined) {
      throw Error("IAM authorizer can not be configured with authorizerId");
    }

    const integration = new ApiGatewayV2Integrations.HttpProxyIntegration({ url: proxyUrl, method });

    const route = new ApiGatewayV2.HttpRoute(this, `${method}${path}`, {
      httpApi: this,
      routeKey: ApiGatewayV2.HttpRouteKey.with(path, method),
      integration,
    });

    const routeCfn = route.node.defaultChild as ApiGatewayV2.CfnRoute;

    routeCfn.authorizationType = authorizerType;
    routeCfn.authorizerId = authorizerId;
    routeCfn.authorizationScopes = authorizationScopes;
  }
}
