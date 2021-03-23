/* eslint-disable no-new */
/* eslint-disable no-console */
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as ApiGatewayV2Integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as Route53 from "@aws-cdk/aws-route53";
import * as Route53Targets from "@aws-cdk/aws-route53-targets";
import * as ACM from "@aws-cdk/aws-certificatemanager";

import { Environment } from "../../src/enums/environment.enum";

interface RouteProps {
  path: string;
  method: ApiGatewayV2.HttpMethod;
  handler: Lambda.IFunction;
  authorizerType?: "JWT" | "AWS_IAM";
  authorizerId?: string;
  authorizationScopes?: string[];
}

interface HttpApiProps extends ApiGatewayV2.HttpApiProps {
  serviceName: string;
}

const hostedZoneId = "Z2PLDO748H3Z0U";
const certArn = "arn:aws:acm:us-east-1:644653163171:certificate/77491685-9b9c-4d4a-9443-ac6463a67bbf";

export class HttpApi extends ApiGatewayV2.HttpApi {
  public readonly apiURL: string;

  constructor(scope: CDK.Construct, id: string, props: HttpApiProps) {
    super(scope, id, props);

    const environment: string = this.node.tryGetContext("environment") as string;
    const recordName = this.getRecordName(environment);
    const zoneName = this.getZoneName(environment);
    const domainName = `${recordName}.${zoneName}`;

    this.apiURL = `https://${domainName}/${props.serviceName}`;

    const hostedZone = Route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
      zoneName,
      hostedZoneId,
    });

    const domainNameResource = new ApiGatewayV2.DomainName(this, "DN", {
      domainName,
      certificate: ACM.Certificate.fromCertificateArn(this, "cert", certArn),
    });

    this.addStage(`environment-stage-${environment}`, {
      stageName: environment,
      autoDeploy: true,
      domainMapping: { domainName: domainNameResource, mappingKey: props.serviceName },
    });

    new Route53.ARecord(this, "ApiRecord", {
      zone: hostedZone,
      recordName,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.ApiGatewayv2Domain(domainNameResource)),
    });
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

  private getRecordName(environment: string): string {
    try {
      if (environment === Environment.Prod) {
        return "api";
      }

      if (environment === Environment.Local) {
        const developer: string = this.node.tryGetContext("developer") as string;

        return developer;
      }

      return environment;
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in HttpApi.getRecordName:\n`, error);

      throw error;
    }
  }

  private getZoneName(environment: string): string {
    try {
      if (environment === Environment.Prod) {
        return "yac.com";
      }

      return "yacchat.com";
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in HttpApi.getZoneName:\n`, error);

      throw error;
    }
  }
}
