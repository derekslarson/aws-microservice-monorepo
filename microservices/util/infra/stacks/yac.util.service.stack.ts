/* eslint-disable no-console */
/* eslint-disable no-new */
import {
  Stack,
  StackProps,
  RemovalPolicy,
  CfnOutput,
  aws_ssm as SSM,
  aws_sns as SNS,
  aws_certificatemanager as ACM,
  aws_route53 as Route53,
  aws_route53_targets as Route53Targets,
  aws_s3 as S3,
  aws_secretsmanager as SecretsManager,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Construct } from "constructs";
import { generateExportNames } from "../../src/enums/exportNames.enum";
import { Environment } from "../../src/enums/environment.enum";

export class YacUtilServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
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
    const rawMessageS3Bucket = new S3.Bucket(this, `RawMessageS3Bucket_${id}`, {
      cors: [
        {
          allowedMethods: [ S3.HttpMethods.PUT ],
          allowedOrigins: [ "*" ],
        },
      ],
      ...(environment !== Environment.Prod && { removalPolicy: RemovalPolicy.DESTROY }),
    });

    const enhancedMessageS3Bucket = new S3.Bucket(this, `EnhancedMessageS3Bucket_${id}`, {
      cors: [
        {
          allowedMethods: [ S3.HttpMethods.GET ],
          allowedOrigins: [ "*" ],
        },
      ],
      ...(environment !== Environment.Prod && { removalPolicy: RemovalPolicy.DESTROY }),
    });

    // SNS Topics
    const userCreatedSnsTopic = new SNS.Topic(this, `UserCreatedSnsTopic_${id}`, { topicName: `UserCreatedSnsTopic_${id}` });
    const organizationCreatedSnsTopic = new SNS.Topic(this, `OrganizationCreatedSnsTopic_${id}`, { topicName: `OrganizationCreatedSnsTopic_${id}` });
    const teamCreatedSnsTopic = new SNS.Topic(this, `TeamCreatedSnsTopic_${id}`, { topicName: `TeamCreatedSnsTopic_${id}` });
    const meetingCreatedSnsTopic = new SNS.Topic(this, `MeetingCreatedSnsTopic_${id}`, { topicName: `MeetingCreatedSnsTopic_${id}` });
    const groupCreatedSnsTopic = new SNS.Topic(this, `GroupCreatedSnsTopic_${id}`, { topicName: `GroupCreatedSnsTopic_${id}` });

    const userAddedToOrganizationSnsTopic = new SNS.Topic(this, `UserAddedToOrganizationSnsTopic_${id}`, { topicName: `UserAddedToOrganizationSnsTopic_${id}` });
    const userAddedToTeamSnsTopic = new SNS.Topic(this, `UserAddedToTeamSnsTopic_${id}`, { topicName: `UserAddedToTeamSnsTopic_${id}` });
    const userAddedToGroupSnsTopic = new SNS.Topic(this, `UserAddedToGroupSnsTopic_${id}`, { topicName: `UserAddedToGroupSnsTopic_${id}` });
    const userAddedToMeetingSnsTopic = new SNS.Topic(this, `UserAddedToMeetingSnsTopic_${id}`, { topicName: `UserAddedToMeetingSnsTopic_${id}` });
    const userAddedAsFriendSnsTopic = new SNS.Topic(this, `UserAddedAsFriendSnsTopic_${id}`, { topicName: `UserAddedAsFriendSnsTopic_${id}` });

    const userRemovedFromOrganizationSnsTopic = new SNS.Topic(this, `UserRemovedFromOrganizationSnsTopic_${id}`, { topicName: `UserRemovedFromOrganizationSnsTopic_${id}` });
    const userRemovedFromTeamSnsTopic = new SNS.Topic(this, `UserRemovedFromTeamSnsTopic_${id}`, { topicName: `UserRemovedFromTeamSnsTopic_${id}` });
    const userRemovedFromGroupSnsTopic = new SNS.Topic(this, `UserRemovedFromGroupSnsTopic_${id}`, { topicName: `UserRemovedFromGroupSnsTopic_${id}` });
    const userRemovedFromMeetingSnsTopic = new SNS.Topic(this, `UserRemovedFromMeetingSnsTopic_${id}`, { topicName: `UserRemovedFromMeetingSnsTopic_${id}` });
    const userRemovedAsFriendSnsTopic = new SNS.Topic(this, `UserRemovedAsFriendSnsTopic_${id}`, { topicName: `UserRemovedAsFriendSnsTopic_${id}` });

    const messageCreatedSnsTopic = new SNS.Topic(this, `MessageCreatedSnsTopic_${id}`, { topicName: `MessageCreatedSnsTopic_${id}` });
    const messageUpdatedSnsTopic = new SNS.Topic(this, `MessageUpdatedSnsTopic_${id}`, { topicName: `MessageUpdatedSnsTopic_${id}` });

    const messageTranscodedSnsTopic = new SNS.Topic(this, `MessageTranscodedSnsTopic_${id}`, { topicName: `MessageTranscodedSnsTopic_${id}` });
    const messageTranscribedSnsTopic = new SNS.Topic(this, `MessageTranscribedSnsTopic_${id}`, { topicName: `MessageTranscribedSnsTopic_${id}` });

    const billingPlanUpdatedSnsTopic = new SNS.Topic(this, `BillingPlanUpdatedSnsTopic_${id}`, { topicName: `BillingPlanUpdatedSnsTopic_${id}` });

    const createUserRequestSnsTopic = new SNS.Topic(this, `CreateUserRequestSnsTopic_${id}`, { topicName: `CreateUserRequestSnsTopic_${id}` });

    // Secret for signing token for use in message flow (core and message services)
    const messageUploadTokenSecret = new SecretsManager.Secret(this, `MessageUploadTokenSecret_${id}`);

    const ExportNames = generateExportNames(environment === Environment.Local ? developer : environment);

    // Stack Exports (to be impported by other stacks)
    new CfnOutput(this, `CustomDomainNameExport_${id}`, {
      exportName: ExportNames.CustomDomainName,
      value: domainName.name,
    });

    new CfnOutput(this, `RegionalDomainNameExport_${id}`, {
      exportName: ExportNames.RegionalDomainName,
      value: domainName.regionalDomainName,
    });

    new CfnOutput(this, `RegionalHostedZoneIdExport_${id}`, {
      exportName: ExportNames.RegionalHostedZoneId,
      value: domainName.regionalHostedZoneId,
    });

    new CfnOutput(this, `UserCreatedSnsTopicExport_${id}`, {
      exportName: ExportNames.UserCreatedSnsTopicArn,
      value: userCreatedSnsTopic.topicArn,
    });

    new CfnOutput(this, `OrganizationCreatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.OrganizationCreatedSnsTopicArn,
      value: organizationCreatedSnsTopic.topicArn,
    });

    new CfnOutput(this, `TeamCreatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.TeamCreatedSnsTopicArn,
      value: teamCreatedSnsTopic.topicArn,
    });

    new CfnOutput(this, `MeetingCreatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.MeetingCreatedSnsTopicArn,
      value: meetingCreatedSnsTopic.topicArn,
    });

    new CfnOutput(this, `GroupCreatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.GroupCreatedSnsTopicArn,
      value: groupCreatedSnsTopic.topicArn,
    });

    new CfnOutput(this, `UserAddedToOrganizationSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedToOrganizationSnsTopicArn,
      value: userAddedToOrganizationSnsTopic.topicArn,
    });

    new CfnOutput(this, `UserAddedToTeamSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedToTeamSnsTopicArn,
      value: userAddedToTeamSnsTopic.topicArn,
    });

    new CfnOutput(this, `UserAddedToGroupSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedToGroupSnsTopicArn,
      value: userAddedToGroupSnsTopic.topicArn,
    });

    new CfnOutput(this, `UserAddedToMeetingSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedToMeetingSnsTopicArn,
      value: userAddedToMeetingSnsTopic.topicArn,
    });

    new CfnOutput(this, `UserAddedAsFriendSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedAsFriendSnsTopicArn,
      value: userAddedAsFriendSnsTopic.topicArn,
    });

    new CfnOutput(this, `UserRemovedFromOrganizationSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedFromOrganizationSnsTopicArn,
      value: userRemovedFromOrganizationSnsTopic.topicArn,
    });

    new CfnOutput(this, `UserRemovedFromTeamSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedFromTeamSnsTopicArn,
      value: userRemovedFromTeamSnsTopic.topicArn,
    });

    new CfnOutput(this, `UserRemovedFromGroupSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedFromGroupSnsTopicArn,
      value: userRemovedFromGroupSnsTopic.topicArn,
    });

    new CfnOutput(this, `UserRemovedFromMeetingSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedFromMeetingSnsTopicArn,
      value: userRemovedFromMeetingSnsTopic.topicArn,
    });

    new CfnOutput(this, `UserRemovedAsFriendSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedAsFriendSnsTopicArn,
      value: userRemovedAsFriendSnsTopic.topicArn,
    });

    new CfnOutput(this, `MessageCreatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.MessageCreatedSnsTopicArn,
      value: messageCreatedSnsTopic.topicArn,
    });

    new CfnOutput(this, `MessageUpdatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.MessageUpdatedSnsTopicArn,
      value: messageUpdatedSnsTopic.topicArn,
    });

    new CfnOutput(this, `MessageTranscodedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.MessageTranscodedSnsTopicArn,
      value: messageTranscodedSnsTopic.topicArn,
    });

    new CfnOutput(this, `MessageTranscribedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.MessageTranscribedSnsTopicArn,
      value: messageTranscribedSnsTopic.topicArn,
    });

    new CfnOutput(this, `CreateUserRequestSnsTopicArnExport_${id}`, {
      exportName: ExportNames.CreateUserRequestSnsTopicArn,
      value: createUserRequestSnsTopic.topicArn,
    });

    new CfnOutput(this, `BillingPlanUpdatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.BillingPlanUpdatedSnsTopicArn,
      value: billingPlanUpdatedSnsTopic.topicArn,
    });

    new CfnOutput(this, `RawMessageS3BucketArnExport_${id}`, {
      exportName: ExportNames.RawMessageS3BucketArn,
      value: rawMessageS3Bucket.bucketArn,
    });

    new CfnOutput(this, `EnhancedMessageS3BucketArnExport_${id}`, {
      exportName: ExportNames.EnhancedMessageS3BucketArn,
      value: enhancedMessageS3Bucket.bucketArn,
    });

    new CfnOutput(this, `MessageUploadTokenSecretArn_${id}`, {
      exportName: ExportNames.MessageUploadTokenSecretArn,
      value: messageUploadTokenSecret.secretArn,
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

    new SSM.StringParameter(this, `UserAddedAsFriendSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-added-as-friend-sns-topic-arn`,
      stringValue: userAddedAsFriendSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `UserRemovedAsFriendSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-removed-as-friend-sns-topic-arn`,
      stringValue: userRemovedAsFriendSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `TeamCreatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/team-created-sns-topic-arn`,
      stringValue: teamCreatedSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `MeetingCreatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/meeting-created-sns-topic-arn`,
      stringValue: meetingCreatedSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `GroupCreatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/group-created-sns-topic-arn`,
      stringValue: groupCreatedSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `MessageCreatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/message-created-sns-topic-arn`,
      stringValue: messageCreatedSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `MessageUpdatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/message-updated-sns-topic-arn`,
      stringValue: messageUpdatedSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `MessageTranscodedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/message-transcoded-sns-topic-arn`,
      stringValue: messageTranscodedSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `MessageTranscribedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/message-transcribed-sns-topic-arn`,
      stringValue: messageTranscribedSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `CreateUserRequestSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/create-user-request-sns-topic-arn`,
      stringValue: createUserRequestSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `OrganizationCreatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/organization-created-sns-topic-arn`,
      stringValue: organizationCreatedSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `BillingPlanUpdatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/billing-plan-updated-sns-topic-arn`,
      stringValue: billingPlanUpdatedSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `RawMessageS3BucketNameSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/raw-message-s3-bucket-name`,
      stringValue: rawMessageS3Bucket.bucketName,
    });

    new SSM.StringParameter(this, `EnhancedMessageS3BucketNameSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/enhanced-message-s3-bucket-name`,
      stringValue: enhancedMessageS3Bucket.bucketName,
    });

    new SSM.StringParameter(this, `MessageUploadTokenSecretIdSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/message-upload-token-secret-id`,
      stringValue: messageUploadTokenSecret.secretArn,
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
      console.log(`${new Date().toISOString()} : Error in YacUtilServiceStack recordName getter:\n`, error);

      throw error;
    }
  }
}
