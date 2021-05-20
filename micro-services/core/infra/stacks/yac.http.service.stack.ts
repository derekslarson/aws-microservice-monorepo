import * as CDK from "@aws-cdk/core";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as Route53 from "@aws-cdk/aws-route53";
import * as ACM from "@aws-cdk/aws-certificatemanager";

import { HttpApi } from "../constructs/http.api";
import { Environment } from "../../src/enums/environment.enum";
import { generateExportNames } from "../..";

export interface IYacHttpServiceProps extends CDK.StackProps {
  serviceName: string
  allowMethods?: ApiGatewayV2.CorsHttpMethod[]
}

const hostedZoneId = "Z2PLDO748H3Z0U";
const certArn = "arn:aws:acm:us-east-1:644653163171:certificate/77491685-9b9c-4d4a-9443-ac6463a67bbf";

export class YacHttpServiceStack extends CDK.Stack {
  public httpApi: HttpApi;

  public domainName: ApiGatewayV2.DomainName;

  public hostedZone: Route53.IHostedZone;

  public certificate: ACM.ICertificate;

  public recordName: string;

  public zoneName: string;

  constructor(scope: CDK.Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);
    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const ExportNames = generateExportNames(environment === Environment.Local ? developer : environment);

    const domainName = CDK.Fn.importValue(ExportNames.DomainName);

    this.recordName = this.getRecordName();
    this.zoneName = "yacchat.com";

    this.hostedZone = Route53.HostedZone.fromHostedZoneAttributes(this, `${id}-HostedZone`, {
      zoneName: this.zoneName,
      hostedZoneId,
    });

    this.certificate = ACM.Certificate.fromCertificateArn(this, `${id}-cert`, certArn);

    const domainNameResource = ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `${id}-DomainName`, {
      name: domainName,
      regionalDomainName: domainName,
      regionalHostedZoneId: hostedZoneId,
    }) as ApiGatewayV2.DomainName;

    this.domainName = domainNameResource;

    const origins = environment !== Environment.Prod ? [ `https://${this.recordName}-assets.yacchat.com` ] : [ "https://yac.com", "https://id.yac.com/", "https://app.yac.com/" ];
    const corsCacheMaxAge = environment !== Environment.Prod ? CDK.Duration.minutes(300) : CDK.Duration.minutes(60 * 12);
    this.httpApi = new HttpApi(this, `${id}_Api`, {
      serviceName: props.serviceName,
      domainName: this.domainName,
      hostedZone: this.hostedZone,
      recordName: this.recordName,
      corsPreflight: {
        allowOrigins: origins,
        allowMethods: props.allowMethods || [
          ApiGatewayV2.CorsHttpMethod.GET,
          ApiGatewayV2.CorsHttpMethod.POST,
          ApiGatewayV2.CorsHttpMethod.PATCH,
          ApiGatewayV2.CorsHttpMethod.DELETE,
          ApiGatewayV2.CorsHttpMethod.HEAD,
          ApiGatewayV2.CorsHttpMethod.OPTIONS,
        ],
        // just dev purposes
        maxAge: corsCacheMaxAge,
        allowCredentials: true,
      },
    });
  }

  private getRecordName(): string {
    try {
      const environment = this.node.tryGetContext("environment") as string;
      const developer = this.node.tryGetContext("developer") as string;

      if (environment === Environment.Prod) {
        return "api";
      }

      if (environment === Environment.Dev) {
        return "develop";
      }

      if (environment === Environment.Local) {
        return developer;
      }

      return environment;
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in YacCoreServiceStack.getRecordName:\n`, error);

      throw error;
    }
  }
}
