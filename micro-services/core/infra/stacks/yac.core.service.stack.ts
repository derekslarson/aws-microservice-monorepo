/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-new */

import * as CDK from "@aws-cdk/core";
import * as ACM from "@aws-cdk/aws-certificatemanager";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as SSM from "@aws-cdk/aws-ssm";
import * as Route53 from "@aws-cdk/aws-route53";
import * as Route53Targets from "@aws-cdk/aws-route53-targets";
import * as SNS from "@aws-cdk/aws-sns";
import * as S3 from "@aws-cdk/aws-s3";
import { generateExportNames } from "../../src/enums/exportNames.enum";
import { Environment } from "../../src/enums/environment.enum";

export class YacCoreServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const hostedZoneName = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-name`);
    const hostedZoneId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-id`);
    const certificateArn = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/certificate-arn`);

    const ExportNames = generateExportNames(environment === Environment.Local ? developer : environment);

    const certificate = ACM.Certificate.fromCertificateArn(this, `AcmCertificate_${id}`, certificateArn);

    const hostedZone = Route53.HostedZone.fromHostedZoneAttributes(this, `HostedZone_${id}`, {
      zoneName: hostedZoneName,
      hostedZoneId,
    });

    const domainName = new ApiGatewayV2.DomainName(this, `DomainName_${id}`, { domainName: `${this.recordName}.${hostedZoneName}`, certificate });

    new Route53.ARecord(this, `ARecord_${id}`, {
      zone: hostedZone,
      recordName: this.recordName,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.ApiGatewayv2DomainProperties(domainName.regionalDomainName, domainName.regionalHostedZoneId)),
    });

    const messageS3Bucket = new S3.Bucket(this, `MessageS3Bucket_${id}`, {});

    const clientsUpdatedSnsTopic = new SNS.Topic(this, `ClientsUpdatedSnsTopic_${id}`, { topicName: `ClientsUpdatedSnsTopic_${id}` });
    const userCreatedSnsTopic = new SNS.Topic(this, `UserCreatedSnsTopic_${id}`, { topicName: `UserCreatedSnsTopic_${id}` });

    new CDK.CfnOutput(this, `CustomDomainNameExport_${id}`, {
      exportName: ExportNames.CustomDomainName,
      value: domainName.name,
    });

    new CDK.CfnOutput(this, `RegionalDomainNameExport_${id}`, {
      exportName: ExportNames.RegionalDomainName,
      value: domainName.regionalDomainName,
    });

    new CDK.CfnOutput(this, `RegionalHostedZoneIdExport_${id}`, {
      exportName: ExportNames.RegionalHostedZoneId,
      value: domainName.regionalHostedZoneId,
    });

    new CDK.CfnOutput(this, `ClientsUpdatedSnsTopicExport_${id}`, {
      exportName: ExportNames.ClientsUpdatedSnsTopicArn,
      value: clientsUpdatedSnsTopic.topicArn,
    });

    new CDK.CfnOutput(this, `UserCreatedSnsTopicExport_${id}`, {
      exportName: ExportNames.UserCreatedSnsTopicArn,
      value: userCreatedSnsTopic.topicArn,
    });

    new CDK.CfnOutput(this, `MessageS3BucketArnExport_${id}`, {
      exportName: ExportNames.MessageS3BucketArn,
      value: messageS3Bucket.bucketArn,
    });
  }

  public get recordName(): string {
    try {
      const environment = this.node.tryGetContext("environment") as string;
      const developer = this.node.tryGetContext("developer") as string;

      if (environment === Environment.Prod) {
        return "api-v4";
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
