/* eslint-disable no-nested-ternary */
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
  public domainName: ApiGatewayV2.DomainName;

  public snsTopics: UtilServiceSnsTopics;

  public s3Buckets: UtilServiceS3Buckets;

  public secrets: UtilServiceSecrets;

  constructor(scope: Construct, id: string, props: UtilServiceProps) {
    super(scope, id, props);

    const { environment, stackPrefix } = props;

    const hostedZoneName = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-name`);
    const hostedZoneId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-id`);
    const certificateArn = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/certificate-arn`);

    const certificate = ACM.Certificate.fromCertificateArn(this, `AcmCertificate_${id}`, certificateArn);

    const hostedZone = Route53.HostedZone.fromHostedZoneAttributes(this, `HostedZone_${id}`, {
      zoneName: hostedZoneName,
      hostedZoneId,
    });

    const recordName = environment === Environment.Prod ? "api-v4" : environment === Environment.Dev ? "develop" : stackPrefix;

    this.domainName = new ApiGatewayV2.DomainName(this, `DomainName_${id}`, { domainName: `${recordName}.${hostedZoneName}`, certificate });

    new Route53.ARecord(this, `ARecord_${id}`, {
      zone: hostedZone,
      recordName,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.ApiGatewayv2DomainProperties(this.domainName.regionalDomainName, this.domainName.regionalHostedZoneId)),
    });

    this.s3Buckets = {
      rawMessage: new S3.Bucket(this, `RawMessageS3Bucket_${id}`, {
        cors: [ { allowedMethods: [ S3.HttpMethods.PUT ], allowedOrigins: [ "*" ] } ],
        removalPolicy: environment === Environment.Prod ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      }),
      enhancedMessage: new S3.Bucket(this, `EnhancedMessageS3Bucket_${id}`, {
        cors: [ { allowedMethods: [ S3.HttpMethods.GET ], allowedOrigins: [ "*" ] } ],
        removalPolicy: environment === Environment.Prod ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      }),
    };

    this.snsTopics = {
      userCreated: new SNS.Topic(this, `UserCreatedSnsTopic_${id}`, { topicName: `UserCreatedSnsTopic_${id}` }),
      organizationCreated: new SNS.Topic(this, `OrganizationCreatedSnsTopic_${id}`, { topicName: `OrganizationCreatedSnsTopic_${id}` }),
      teamCreated: new SNS.Topic(this, `TeamCreatedSnsTopic_${id}`, { topicName: `TeamCreatedSnsTopic_${id}` }),
      meetingCreated: new SNS.Topic(this, `MeetingCreatedSnsTopic_${id}`, { topicName: `MeetingCreatedSnsTopic_${id}` }),
      groupCreated: new SNS.Topic(this, `GroupCreatedSnsTopic_${id}`, { topicName: `GroupCreatedSnsTopic_${id}` }),

      userAddedToOrganization: new SNS.Topic(this, `UserAddedToOrganizationSnsTopic_${id}`, { topicName: `UserAddedToOrganizationSnsTopic_${id}` }),
      userAddedToTeam: new SNS.Topic(this, `UserAddedToTeamSnsTopic_${id}`, { topicName: `UserAddedToTeamSnsTopic_${id}` }),
      userAddedToGroup: new SNS.Topic(this, `UserAddedToGroupSnsTopic_${id}`, { topicName: `UserAddedToGroupSnsTopic_${id}` }),
      userAddedToMeeting: new SNS.Topic(this, `UserAddedToMeetingSnsTopic_${id}`, { topicName: `UserAddedToMeetingSnsTopic_${id}` }),
      userAddedAsFriend: new SNS.Topic(this, `UserAddedAsFriendSnsTopic_${id}`, { topicName: `UserAddedAsFriendSnsTopic_${id}` }),

      userRemovedFromOrganization: new SNS.Topic(this, `UserRemovedFromOrganizationSnsTopic_${id}`, { topicName: `UserRemovedFromOrganizationSnsTopic_${id}` }),
      userRemovedFromTeam: new SNS.Topic(this, `UserRemovedFromTeamSnsTopic_${id}`, { topicName: `UserRemovedFromTeamSnsTopic_${id}` }),
      userRemovedFromGroup: new SNS.Topic(this, `UserRemovedFromGroupSnsTopic_${id}`, { topicName: `UserRemovedFromGroupSnsTopic_${id}` }),
      userRemovedFromMeeting: new SNS.Topic(this, `UserRemovedFromMeetingSnsTopic_${id}`, { topicName: `UserRemovedFromMeetingSnsTopic_${id}` }),
      userRemovedAsFriend: new SNS.Topic(this, `UserRemovedAsFriendSnsTopic_${id}`, { topicName: `UserRemovedAsFriendSnsTopic_${id}` }),

      messageCreated: new SNS.Topic(this, `MessageCreatedSnsTopic_${id}`, { topicName: `MessageCreatedSnsTopic_${id}` }),
      messageUpdated: new SNS.Topic(this, `MessageUpdatedSnsTopic_${id}`, { topicName: `MessageUpdatedSnsTopic_${id}` }),

      messageTranscoded: new SNS.Topic(this, `MessageTranscodedSnsTopic_${id}`, { topicName: `MessageTranscodedSnsTopic_${id}` }),
      messageTranscribed: new SNS.Topic(this, `MessageTranscribedSnsTopic_${id}`, { topicName: `MessageTranscribedSnsTopic_${id}` }),

      billingPlanUpdated: new SNS.Topic(this, `BillingPlanUpdatedSnsTopic_${id}`, { topicName: `BillingPlanUpdatedSnsTopic_${id}` }),

      createUserRequest: new SNS.Topic(this, `CreateUserRequestSnsTopic_${id}`, { topicName: `CreateUserRequestSnsTopic_${id}` }),
    };

    // Secret for signing token for use in chunked upload flow (core and chunked-upload services)
    this.secrets = { messageUploadToken: new SecretsManager.Secret(this, `MessageUploadTokenSecret_${id}`) };

    const ExportNames = generateExportNames(stackPrefix);

    // Stack Exports (to be impported by other stacks)
    new CfnOutput(this, `CustomDomainNameExport_${id}`, {
      exportName: ExportNames.CustomDomainName,
      value: this.domainName.name,
    });

    new CfnOutput(this, `RegionalDomainNameExport_${id}`, {
      exportName: ExportNames.RegionalDomainName,
      value: this.domainName.regionalDomainName,
    });

    new CfnOutput(this, `RegionalHostedZoneIdExport_${id}`, {
      exportName: ExportNames.RegionalHostedZoneId,
      value: this.domainName.regionalHostedZoneId,
    });

    new CfnOutput(this, `UserCreatedSnsTopicExport_${id}`, {
      exportName: ExportNames.UserCreatedSnsTopicArn,
      value: this.snsTopics.userCreated.topicArn,
    });

    new CfnOutput(this, `OrganizationCreatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.OrganizationCreatedSnsTopicArn,
      value: this.snsTopics.organizationCreated.topicArn,
    });

    new CfnOutput(this, `TeamCreatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.TeamCreatedSnsTopicArn,
      value: this.snsTopics.teamCreated.topicArn,
    });

    new CfnOutput(this, `MeetingCreatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.MeetingCreatedSnsTopicArn,
      value: this.snsTopics.meetingCreated.topicArn,
    });

    new CfnOutput(this, `GroupCreatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.GroupCreatedSnsTopicArn,
      value: this.snsTopics.groupCreated.topicArn,
    });

    new CfnOutput(this, `UserAddedToOrganizationSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedToOrganizationSnsTopicArn,
      value: this.snsTopics.userAddedToOrganization.topicArn,
    });

    new CfnOutput(this, `UserAddedToTeamSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedToTeamSnsTopicArn,
      value: this.snsTopics.userAddedToTeam.topicArn,
    });

    new CfnOutput(this, `UserAddedToGroupSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedToGroupSnsTopicArn,
      value: this.snsTopics.userAddedToGroup.topicArn,
    });

    new CfnOutput(this, `UserAddedToMeetingSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedToMeetingSnsTopicArn,
      value: this.snsTopics.userAddedToMeeting.topicArn,
    });

    new CfnOutput(this, `UserAddedAsFriendSnsTopicExport_${id}`, {
      exportName: ExportNames.UserAddedAsFriendSnsTopicArn,
      value: this.snsTopics.userAddedAsFriend.topicArn,
    });

    new CfnOutput(this, `UserRemovedFromOrganizationSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedFromOrganizationSnsTopicArn,
      value: this.snsTopics.userRemovedFromOrganization.topicArn,
    });

    new CfnOutput(this, `UserRemovedFromTeamSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedFromTeamSnsTopicArn,
      value: this.snsTopics.userRemovedFromTeam.topicArn,
    });

    new CfnOutput(this, `UserRemovedFromGroupSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedFromGroupSnsTopicArn,
      value: this.snsTopics.userRemovedFromGroup.topicArn,
    });

    new CfnOutput(this, `UserRemovedFromMeetingSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedFromMeetingSnsTopicArn,
      value: this.snsTopics.userRemovedFromMeeting.topicArn,
    });

    new CfnOutput(this, `UserRemovedAsFriendSnsTopicExport_${id}`, {
      exportName: ExportNames.UserRemovedAsFriendSnsTopicArn,
      value: this.snsTopics.userRemovedAsFriend.topicArn,
    });

    new CfnOutput(this, `MessageCreatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.MessageCreatedSnsTopicArn,
      value: this.snsTopics.messageCreated.topicArn,
    });

    new CfnOutput(this, `MessageUpdatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.MessageUpdatedSnsTopicArn,
      value: this.snsTopics.messageUpdated.topicArn,
    });

    new CfnOutput(this, `MessageTranscodedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.MessageTranscodedSnsTopicArn,
      value: this.snsTopics.messageTranscoded.topicArn,
    });

    new CfnOutput(this, `MessageTranscribedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.MessageTranscribedSnsTopicArn,
      value: this.snsTopics.messageTranscribed.topicArn,
    });

    new CfnOutput(this, `CreateUserRequestSnsTopicArnExport_${id}`, {
      exportName: ExportNames.CreateUserRequestSnsTopicArn,
      value: this.snsTopics.createUserRequest.topicArn,
    });

    new CfnOutput(this, `BillingPlanUpdatedSnsTopicArnExport_${id}`, {
      exportName: ExportNames.BillingPlanUpdatedSnsTopicArn,
      value: this.snsTopics.billingPlanUpdated.topicArn,
    });

    new CfnOutput(this, `RawMessageS3BucketArnExport_${id}`, {
      exportName: ExportNames.RawMessageS3BucketArn,
      value: this.s3Buckets.rawMessage.bucketArn,
    });

    new CfnOutput(this, `EnhancedMessageS3BucketArnExport_${id}`, {
      exportName: ExportNames.EnhancedMessageS3BucketArn,
      value: this.s3Buckets.enhancedMessage.bucketArn,
    });

    new CfnOutput(this, `MessageUploadTokenSecretArn_${id}`, {
      exportName: ExportNames.MessageUploadTokenSecretArn,
      value: this.secrets.messageUploadToken.secretArn,
    });

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `YacClientRedirectUriSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-added-to-team-sns-topic-arn`,
      stringValue: this.snsTopics.userAddedToTeam.topicArn,
    });

    new SSM.StringParameter(this, `UserRemovedFromTeamSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-removed-from-team-sns-topic-arn`,
      stringValue: this.snsTopics.userRemovedFromTeam.topicArn,
    });

    new SSM.StringParameter(this, `UserAddedToGroupSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-added-to-group-sns-topic-arn`,
      stringValue: this.snsTopics.userAddedToGroup.topicArn,
    });

    new SSM.StringParameter(this, `UserRemovedFromGroupSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-removed-from-group-sns-topic-arn`,
      stringValue: this.snsTopics.userRemovedFromGroup.topicArn,
    });

    new SSM.StringParameter(this, `UserAddedToMeetingSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-added-to-meeting-sns-topic-arn`,
      stringValue: this.snsTopics.userAddedToMeeting.topicArn,
    });

    new SSM.StringParameter(this, `UserRemovedFromMeetingSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-removed-from-meeting-sns-topic-arn`,
      stringValue: this.snsTopics.userRemovedFromMeeting.topicArn,
    });

    new SSM.StringParameter(this, `UserAddedAsFriendSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-added-as-friend-sns-topic-arn`,
      stringValue: this.snsTopics.userAddedAsFriend.topicArn,
    });

    new SSM.StringParameter(this, `UserRemovedAsFriendSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-removed-as-friend-sns-topic-arn`,
      stringValue: this.snsTopics.userRemovedAsFriend.topicArn,
    });

    new SSM.StringParameter(this, `TeamCreatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/team-created-sns-topic-arn`,
      stringValue: this.snsTopics.teamCreated.topicArn,
    });

    new SSM.StringParameter(this, `MeetingCreatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/meeting-created-sns-topic-arn`,
      stringValue: this.snsTopics.meetingCreated.topicArn,
    });

    new SSM.StringParameter(this, `GroupCreatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/group-created-sns-topic-arn`,
      stringValue: this.snsTopics.groupCreated.topicArn,
    });

    new SSM.StringParameter(this, `MessageCreatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/message-created-sns-topic-arn`,
      stringValue: this.snsTopics.messageCreated.topicArn,
    });

    new SSM.StringParameter(this, `MessageUpdatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/message-updated-sns-topic-arn`,
      stringValue: this.snsTopics.messageUpdated.topicArn,
    });

    new SSM.StringParameter(this, `MessageTranscodedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/message-transcoded-sns-topic-arn`,
      stringValue: this.snsTopics.messageTranscoded.topicArn,
    });

    new SSM.StringParameter(this, `MessageTranscribedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/message-transcribed-sns-topic-arn`,
      stringValue: this.snsTopics.messageTranscribed.topicArn,
    });

    new SSM.StringParameter(this, `CreateUserRequestSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/create-user-request-sns-topic-arn`,
      stringValue: this.snsTopics.createUserRequest.topicArn,
    });

    new SSM.StringParameter(this, `OrganizationCreatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/organization-created-sns-topic-arn`,
      stringValue: this.snsTopics.organizationCreated.topicArn,
    });

    new SSM.StringParameter(this, `BillingPlanUpdatedSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/billing-plan-updated-sns-topic-arn`,
      stringValue: this.snsTopics.billingPlanUpdated.topicArn,
    });

    new SSM.StringParameter(this, `RawMessageS3BucketNameSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/raw-message-s3-bucket-name`,
      stringValue: this.s3Buckets.rawMessage.bucketName,
    });

    new SSM.StringParameter(this, `EnhancedMessageS3BucketNameSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/enhanced-message-s3-bucket-name`,
      stringValue: this.s3Buckets.enhancedMessage.bucketName,
    });

    new SSM.StringParameter(this, `MessageUploadTokenSecretIdSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/message-upload-token-secret-id`,
      stringValue: this.secrets.messageUploadToken.secretArn,
    });
  }
}

export interface UtilServiceProps extends StackProps {
  environment: string;
  stackPrefix: string;
}

export interface UtilServiceSnsTopics {
  userCreated: SNS.Topic;
  organizationCreated: SNS.Topic;
  teamCreated: SNS.Topic;
  meetingCreated: SNS.Topic;
  groupCreated: SNS.Topic;

  userAddedToOrganization: SNS.Topic;
  userAddedToTeam: SNS.Topic;
  userAddedToGroup: SNS.Topic;
  userAddedToMeeting: SNS.Topic;
  userAddedAsFriend: SNS.Topic;

  userRemovedFromOrganization: SNS.Topic;
  userRemovedFromTeam: SNS.Topic;
  userRemovedFromGroup: SNS.Topic;
  userRemovedFromMeeting: SNS.Topic;
  userRemovedAsFriend: SNS.Topic;

  messageCreated: SNS.Topic;
  messageUpdated: SNS.Topic;

  messageTranscoded: SNS.Topic;
  messageTranscribed: SNS.Topic;

  billingPlanUpdated: SNS.Topic;

  createUserRequest: SNS.Topic;
}

export interface UtilServiceS3Buckets {
  rawMessage: S3.Bucket;
  enhancedMessage: S3.Bucket;
}

export interface UtilServiceSecrets {
  messageUploadToken: SecretsManager.Secret;
}
