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

export class YacUtilServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    // Manually Set SSM Parameters Related to Route 53
    const hostedZoneName = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-name`);
    const hostedZoneId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-id`);
    const certificateArn = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/certificate-arn`);

    // Domain Name Related Resources
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

    // S3 Buckets
    // We need to define this here so that it can be accessed in core as well as the message streaming service
    const messageS3Bucket = new S3.Bucket(this, `MessageS3Bucket_${id}`, {});

    // SNS Topics
    const clientsUpdatedSnsTopic = new SNS.Topic(this, `ClientsUpdatedSnsTopic_${id}`, { topicName: `ClientsUpdatedSnsTopic_${id}` });
    const userCreatedSnsTopic = new SNS.Topic(this, `UserCreatedSnsTopic_${id}`, { topicName: `UserCreatedSnsTopic_${id}` });
    const userAddedToTeamSnsTopic = new SNS.Topic(this, `UserAddedToTeamSnsTopic_${id}`, { topicName: `UserAddedToTeamSnsTopic_${id}` });
    const userRemovedFromTeamSnsTopic = new SNS.Topic(this, `UserRemovedFromTeamSnsTopic_${id}`, { topicName: `UserRemovedFromTeamSnsTopic_${id}` });
    const userAddedToGroupSnsTopic = new SNS.Topic(this, `UserAddedToGroupSnsTopic_${id}`, { topicName: `UserAddedToGroupSnsTopic_${id}` });
    const userRemovedFromGroupSnsTopic = new SNS.Topic(this, `UserRemovedFromGroupSnsTopic_${id}`, { topicName: `UserRemovedFromGroupSnsTopic_${id}` });
    const userAddedToMeetingSnsTopic = new SNS.Topic(this, `UserAddedToMeetingSnsTopic_${id}`, { topicName: `UserAddedToMeetingSnsTopic_${id}` });
    const userRemovedFromMeetingSnsTopic = new SNS.Topic(this, `UserRemovedFromMeetingSnsTopic_${id}`, { topicName: `UserRemovedFromMeetingSnsTopic_${id}` });

    const ExportNames = generateExportNames(environment === Environment.Local ? developer : environment);

    // Stack Exports (to be impported by other stacks)
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

    new CDK.CfnOutput(this, `UserAddedToTeamSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedToTeamSnsTopicArn,
      value: userAddedToTeamSnsTopic.topicArn,
    });

    new CDK.CfnOutput(this, `UserRemovedFromTeamSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedFromTeamSnsTopicArn,
      value: userRemovedFromTeamSnsTopic.topicArn,
    });

    new CDK.CfnOutput(this, `UserAddedToGroupSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedToGroupSnsTopicArn,
      value: userAddedToGroupSnsTopic.topicArn,
    });

    new CDK.CfnOutput(this, `UserRemovedFromGroupSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedFromGroupSnsTopicArn,
      value: userRemovedFromGroupSnsTopic.topicArn,
    });

    new CDK.CfnOutput(this, `UserAddedToMeetingSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedToMeetingSnsTopicArn,
      value: userAddedToMeetingSnsTopic.topicArn,
    });

    new CDK.CfnOutput(this, `UserRemovedFromMeetingSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedFromMeetingSnsTopicArn,
      value: userRemovedFromMeetingSnsTopic.topicArn,
    });

    new CDK.CfnOutput(this, `MessageS3BucketArnExport_${id}`, {
      exportName: ExportNames.MessageS3BucketArn,
      value: messageS3Bucket.bucketArn,
    });

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `YacClientRedirectUriSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-added-to-team-sns-topic-arn`,
      stringValue: userAddedToTeamSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `UserRemovedFromTeamSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-removed-from-team-sns-topic-arn`,
      stringValue: userRemovedFromTeamSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `UserAddedToGroupSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-added-to-group-sns-topic-arn`,
      stringValue: userAddedToGroupSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `UserRemovedFromGroupSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-removed-from-group-sns-topic-arn`,
      stringValue: userRemovedFromGroupSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `UserAddedToMeetingSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-added-to-meeting-sns-topic-arn`,
      stringValue: userAddedToMeetingSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `UserRemovedFromMeetingSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-removed-from-meeting-sns-topic-arn`,
      stringValue: userRemovedFromMeetingSnsTopic.topicArn,
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
