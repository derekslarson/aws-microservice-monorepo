import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as ApiGatewayV2Integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as route53 from "@aws-cdk/aws-route53";
import * as r53Targets from "@aws-cdk/aws-route53-targets";
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

  constructor(scope: CDK.Construct, id: string, props?: HttpApiProps) {
    super(scope, id, props);
    const environment: string = this.node.tryGetContext("environment") as string;
    const developer: string = this.node.tryGetContext("developer") as string;

    if (props?.serviceName) {
      let myHostedZone;
      let recordName;

      if (environment !== Environment.Prod) {
        const prefix = environment === Environment.Local ? developer : environment;
        myHostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
          zoneName: "yacchat.com",
          hostedZoneId,
        });
        recordName = `${prefix}`;
        this.apiURL = `${recordName}.yacchat.com`;
      } else {
        myHostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
          zoneName: "yac.com",
          hostedZoneId,
        });
        recordName = "api";
        this.apiURL = `${recordName}.yac.com`;
      }

      const dn = new ApiGatewayV2.DomainName(this, "DN", {
        domainName: this.apiURL,
        certificate: ACM.Certificate.fromCertificateArn(this, "cert", certArn),
      });

      this.addStage(`environment-stage-${environment}`, {
        stageName: environment,
        autoDeploy: true,
        domainMapping: { domainName: dn, mappingKey: props.serviceName },
      });

      this.apiURL = `https://${this.apiURL}/${props.serviceName}`;

      // const apiCloudfrontDistribution = new CloudFront.CloudFrontWebDistribution();
      // eslint-disable-next-line no-new
      new route53.ARecord(this, "ApiRecord", {
        zone: myHostedZone,
        recordName,
        // eslint-disable-next-line
      // @ts-ignore
        // eslint-disable-next-line
      target: route53.RecordTarget.fromAlias(new r53Targets.ApiGatewayv2Domain(dn)),
      });
    }
  }

  public addRoute(props: RouteProps): void {
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
  }
}
