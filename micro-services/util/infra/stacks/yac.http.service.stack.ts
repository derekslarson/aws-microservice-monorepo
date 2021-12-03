/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as Route53 from "@aws-cdk/aws-route53";
import * as ACM from "@aws-cdk/aws-certificatemanager";
import * as SSM from "@aws-cdk/aws-ssm";
import * as Lambda from "@aws-cdk/aws-lambda";
import { HttpApi } from "../constructs/http.api";
import { Environment } from "../../src/enums/environment.enum";
import { generateExportNames } from "../..";

export interface IYacHttpServiceProps extends CDK.StackProps {
  serviceName: string;
  // default true
  addAuthorizer?: boolean;
}

export class YacHttpServiceStack extends CDK.Stack {
  public httpApi: HttpApi;

  public domainName: ApiGatewayV2.IDomainName;

  public hostedZone: Route53.IHostedZone;

  public certificate: ACM.ICertificate;

  public zoneName: string;

  constructor(scope: CDK.Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);
    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;
    const addAuthorizer = props.addAuthorizer ?? true;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const ExportNames = generateExportNames(environment === Environment.Local ? developer : environment);
    const customDomainName = CDK.Fn.importValue(ExportNames.CustomDomainName);
    const regionalDomainName = CDK.Fn.importValue(ExportNames.RegionalDomainName);
    const regionalHostedZoneId = CDK.Fn.importValue(ExportNames.RegionalHostedZoneId);
    let authorizerHandler: Lambda.IFunction | undefined;

    if (addAuthorizer) {
      authorizerHandler = Lambda.Function.fromFunctionArn(this, `AuthorizerHandler_${id}`, CDK.Fn.importValue(ExportNames.AuthorizerHandlerFunctionArn));
    }

    const certificateArn = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/certificate-arn`);
    const hostedZoneId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-id`);
    this.zoneName = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-name`);

    this.hostedZone = Route53.HostedZone.fromHostedZoneAttributes(this, `HostedZone_${id}`, {
      zoneName: this.zoneName,
      hostedZoneId,
    });

    this.certificate = ACM.Certificate.fromCertificateArn(this, `AcmCertificate_${id}`, certificateArn);

    this.domainName = ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `DomainName_${id}`, {
      name: customDomainName,
      regionalDomainName,
      regionalHostedZoneId,
    });

    this.httpApi = new HttpApi(this, `${id}-Api`, {
      serviceName: props.serviceName,
      domainName: this.domainName,
      corsAllowedOrigins: environment !== Environment.Prod ? [ `https://${this.recordName}-assets.yacchat.com` ] : [ "https://yac.com", "https://id.yac.com/", "https://app.yac.com/" ],
      authorizerHandler,
    });
  }

  public get recordName(): string {
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
      console.log(`${new Date().toISOString()} : Error in YacCoreServiceStackg recordName getter:\n`, error);

      throw error;
    }
  }
}
