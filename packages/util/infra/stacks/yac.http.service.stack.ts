/* eslint-disable no-new */
import {
  Stack,
  StackProps,
  aws_lambda as Lambda,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Construct } from "constructs";
import { HttpApi } from "../constructs/http.api";

export class YacHttpServiceStack extends Stack {
  public httpApi: HttpApi;

  constructor(scope: Construct, id: string, props: HttpServiceStackProps) {
    super(scope, id, props);

    const { serviceName, domainName, authorizerHandler } = props;

    // this.zoneName = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-name`);
    // const certificateArn = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/certificate-arn`);
    // const hostedZoneId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-id`);

    // this.hostedZone = Route53.HostedZone.fromHostedZoneAttributes(this, `HostedZone_${id}`, {
    //   zoneName: this.zoneName,
    //   hostedZoneId,
    // });

    // this.certificate = ACM.Certificate.fromCertificateArn(this, `AcmCertificate_${id}`, certificateArn);

    this.httpApi = new HttpApi(this, `${id}-Api`, {
      serviceName,
      domainName,
      authorizerHandler,
    });
  }

  // public get recordName(): string {
  //   try {
  //     const environment = this.node.tryGetContext("environment") as string;
  //     const developer = this.node.tryGetContext("developer") as string;

  //     if (environment === Environment.Prod) {
  //       return "api";
  //     }

  //     if (environment === Environment.Dev) {
  //       return "develop";
  //     }

  //     if (environment === Environment.Local) {
  //       return developer;
  //     }

  //     return environment;
  //   } catch (error) {
  //     console.log(`${new Date().toISOString()} : Error in YacCoreServiceStackg recordName getter:\n`, error);

  //     throw error;
  //   }
  // }
}

export interface HttpServiceStackProps extends StackProps {
  serviceName: string;
  domainName: ApiGatewayV2.DomainName;
  authorizerHandler?: Lambda.Function;
}
