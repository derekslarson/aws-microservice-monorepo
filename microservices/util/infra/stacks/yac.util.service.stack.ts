/* eslint-disable no-new */
import {
  Stack,
  StackProps,
  RemovalPolicy,
  CfnOutput,
  aws_ssm as SSM,
  aws_sns as SNS,
  aws_s3 as S3,
  aws_secretsmanager as SecretsManager,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { generateExportNames } from "../../src/enums/exportNames.enum";
import { Environment } from "../../src/enums/environment.enum";
import { DomainName } from "../constructs/domainName";

export class YacUtilServiceStack extends Stack {
  public exports: YacUtilServiceExports;

  constructor(scope: Construct, id: string, props: YacUtilServiceProps) {
    super(scope, id, props);

    const { environment } = props;

    const isLocal = !Object.values(Environment).includes(environment as Environment);

    // Manually set SSM parameters
    const stripeApiKey = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/stripe-api-key`);
    const stripeFreePlanProductId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/stripe-free-plan-product-id`);
    const stripePaidPlanProductId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/stripe-paid-plan-product-id`);
    const stripeWebhookSecret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/stripe-webhook-secret`);

    const googleClientId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/google-client-id`);
    const googleClientSecret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/google-client-secret`);

    const slackClientId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/slack-client-id`);
    const slackClientSecret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/slack-client-secret`);

    const audoAiApiKey = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/audo-ai-api-key`);

    const gcmServerKey = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/gcm-server-key`);

    const hostedZoneName = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/hosted-zone-name`);
    const hostedZoneId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/hosted-zone-id`);
    const certificateArn = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${isLocal ? Environment.Dev : environment}/certificate-arn`);

    // S3 Buckets
    const rawMessageS3Bucket = new S3.Bucket(this, `RawMessageS3Bucket_${id}`, {
      cors: [ { allowedMethods: [ S3.HttpMethods.PUT ], allowedOrigins: [ "*" ] } ],
      removalPolicy: environment === Environment.Prod ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    const enhancedMessageS3Bucket = new S3.Bucket(this, `EnhancedMessageS3Bucket_${id}`, {
      cors: [ { allowedMethods: [ S3.HttpMethods.GET ], allowedOrigins: [ "*" ] } ],
      removalPolicy: environment === Environment.Prod ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
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

    // Secrets
    const messageUploadTokenSecret = new SecretsManager.Secret(this, `MessageUploadTokenSecret_${id}`);

    // Domain Names
    const domainName = new DomainName(this, `DomainName_${id}`, { environment, hostedZoneId, hostedZoneName, certificateArn });

    // Exports
    const ExportNames = generateExportNames(environment);

    this.exports = {
      certificateArn: new CfnOutput(this, `CertificateArnExport_${id}`, { exportName: ExportNames.CertificateArn, value: certificateArn }).value as string,
      secretArns: { messageUploadToken: new CfnOutput(this, `MessageUploadTokenSecretArn_${id}`, { exportName: ExportNames.MessageUploadTokenSecretArn, value: messageUploadTokenSecret.secretArn }).value as string },
      domainNameAttributes: {
        name: new CfnOutput(this, `DomainNameNameExport_${id}`, { exportName: ExportNames.DomainNameName, value: domainName.name }).value as string,
        regionalDomainName: new CfnOutput(this, `DomainNameRegionalDomainNameExport_${id}`, { exportName: ExportNames.DomainNameRegionalDomainName, value: domainName.regionalDomainName }).value as string,
        regionalHostedZoneId: new CfnOutput(this, `DomainNameRegionalHostedZoneIdExport_${id}`, { exportName: ExportNames.DomainNameRegionalHostedZoneId, value: domainName.regionalHostedZoneId }).value as string,
      },
      hostedZoneAttributes: {
        id: new CfnOutput(this, `HostedZoneIdExport_${id}`, { exportName: ExportNames.HostedZoneId, value: hostedZoneId }).value as string,
        name: new CfnOutput(this, `HostedZoneNameExport_${id}`, { exportName: ExportNames.HostedZoneName, value: hostedZoneName }).value as string,

      },
      googleClient: {
        id: new CfnOutput(this, `GoogleClientIdExport_${id}`, { exportName: ExportNames.GoogleClientId, value: googleClientId }).value as string,
        secret: new CfnOutput(this, `GoogleClientSecretExport_${id}`, { exportName: ExportNames.GoogleClientSecret, value: googleClientSecret }).value as string,
      },
      slackClient: {
        id: new CfnOutput(this, `SlackClientIdExport_${id}`, { exportName: ExportNames.SlackClientId, value: slackClientId }).value as string,
        secret: new CfnOutput(this, `SlackClientSecretExport_${id}`, { exportName: ExportNames.SlackClientSecret, value: slackClientSecret }).value as string,
      },
      gcmServerKey: new CfnOutput(this, `GcmServerKeyExport_${id}`, { exportName: ExportNames.GcmServerKey, value: gcmServerKey }).value as string,
      stripe: {
        apiKey: new CfnOutput(this, `StripeApiKeyExport_${id}`, { exportName: ExportNames.StripeApiKey, value: stripeApiKey }).value as string,
        freePlanProductId: new CfnOutput(this, `StripeFreePlanProductIdExport_${id}`, { exportName: ExportNames.StripeFreePlanProductId, value: stripeFreePlanProductId }).value as string,
        paidPlanProductId: new CfnOutput(this, `StripePaidPlanProductIdExport_${id}`, { exportName: ExportNames.StripePaidPlanProductId, value: stripePaidPlanProductId }).value as string,
        webhookSecret: new CfnOutput(this, `StripeWebhookSecretExport_${id}`, { exportName: ExportNames.StripeWebhookSecret, value: stripeWebhookSecret }).value as string,
      },
      audoAi: { apiKey: new CfnOutput(this, `AudoAiApiKeyExport_${id}`, { exportName: ExportNames.AudoAiApiKey, value: audoAiApiKey }).value as string },
      s3BucketNames: {
        rawMessage: new CfnOutput(this, `RawMessageS3BucketArnExport_${id}`, { exportName: ExportNames.RawMessageS3BucketArn, value: rawMessageS3Bucket.bucketArn }).value as string,
        enhancedMessage: new CfnOutput(this, `EnhancedMessageS3BucketArnExport_${id}`, { exportName: ExportNames.EnhancedMessageS3BucketArn, value: enhancedMessageS3Bucket.bucketArn }).value as string,
      },
      snsTopicArns: {
        userCreated: new CfnOutput(this, `UserCreatedSnsTopicExport_${id}`, { exportName: ExportNames.UserCreatedSnsTopicArn, value: userCreatedSnsTopic.topicArn }).value as string,
        organizationCreated: new CfnOutput(this, `OrganizationCreatedSnsTopicArnExport_${id}`, { exportName: ExportNames.OrganizationCreatedSnsTopicArn, value: organizationCreatedSnsTopic.topicArn }).value as string,
        teamCreated: new CfnOutput(this, `TeamCreatedSnsTopicArnExport_${id}`, { exportName: ExportNames.TeamCreatedSnsTopicArn, value: teamCreatedSnsTopic.topicArn }).value as string,
        meetingCreated: new CfnOutput(this, `MeetingCreatedSnsTopicArnExport_${id}`, { exportName: ExportNames.MeetingCreatedSnsTopicArn, value: meetingCreatedSnsTopic.topicArn }).value as string,
        groupCreated: new CfnOutput(this, `GroupCreatedSnsTopicArnExport_${id}`, { exportName: ExportNames.GroupCreatedSnsTopicArn, value: groupCreatedSnsTopic.topicArn }).value as string,

        userAddedToOrganization: new CfnOutput(this, `UserAddedToOrganizationSnsTopicExport_${id}`, { exportName: ExportNames.UserAddedToOrganizationSnsTopicArn, value: userAddedToOrganizationSnsTopic.topicArn }).value as string,
        userAddedToTeam: new CfnOutput(this, `UserAddedToTeamSnsTopicExport_${id}`, { exportName: ExportNames.UserAddedToTeamSnsTopicArn, value: userAddedToTeamSnsTopic.topicArn }).value as string,
        userAddedToGroup: new CfnOutput(this, `UserAddedToGroupSnsTopicExport_${id}`, { exportName: ExportNames.UserAddedToGroupSnsTopicArn, value: userAddedToGroupSnsTopic.topicArn }).value as string,
        userAddedToMeeting: new CfnOutput(this, `UserAddedToMeetingSnsTopicExport_${id}`, { exportName: ExportNames.UserAddedToMeetingSnsTopicArn, value: userAddedToMeetingSnsTopic.topicArn }).value as string,
        userAddedAsFriend: new CfnOutput(this, `UserAddedAsFriendSnsTopicExport_${id}`, { exportName: ExportNames.UserAddedAsFriendSnsTopicArn, value: userAddedAsFriendSnsTopic.topicArn }).value as string,

        userRemovedFromOrganization: new CfnOutput(this, `UserRemovedFromOrganizationSnsTopicExport_${id}`, { exportName: ExportNames.UserRemovedFromOrganizationSnsTopicArn, value: userRemovedFromOrganizationSnsTopic.topicArn }).value as string,
        userRemovedFromTeam: new CfnOutput(this, `UserRemovedFromTeamSnsTopicExport_${id}`, { exportName: ExportNames.UserRemovedFromTeamSnsTopicArn, value: userRemovedFromTeamSnsTopic.topicArn }).value as string,
        userRemovedFromGroup: new CfnOutput(this, `UserRemovedFromGroupSnsTopicExport_${id}`, { exportName: ExportNames.UserRemovedFromGroupSnsTopicArn, value: userRemovedFromGroupSnsTopic.topicArn }).value as string,
        userRemovedFromMeeting: new CfnOutput(this, `UserRemovedFromMeetingSnsTopicExport_${id}`, { exportName: ExportNames.UserRemovedFromMeetingSnsTopicArn, value: userRemovedFromMeetingSnsTopic.topicArn }).value as string,
        userRemovedAsFriend: new CfnOutput(this, `UserRemovedAsFriendSnsTopicExport_${id}`, { exportName: ExportNames.UserRemovedAsFriendSnsTopicArn, value: userRemovedAsFriendSnsTopic.topicArn }).value as string,

        messageCreated: new CfnOutput(this, `MessageCreatedSnsTopicArnExport_${id}`, { exportName: ExportNames.MessageCreatedSnsTopicArn, value: messageCreatedSnsTopic.topicArn }).value as string,
        messageUpdated: new CfnOutput(this, `MessageUpdatedSnsTopicArnExport_${id}`, { exportName: ExportNames.MessageUpdatedSnsTopicArn, value: messageUpdatedSnsTopic.topicArn }).value as string,
        messageTranscoded: new CfnOutput(this, `MessageTranscodedSnsTopicArnExport_${id}`, { exportName: ExportNames.MessageTranscodedSnsTopicArn, value: messageTranscodedSnsTopic.topicArn }).value as string,
        messageTranscribed: new CfnOutput(this, `MessageTranscribedSnsTopicArnExport_${id}`, { exportName: ExportNames.MessageTranscribedSnsTopicArn, value: messageTranscribedSnsTopic.topicArn }).value as string,

        billingPlanUpdated: new CfnOutput(this, `BillingPlanUpdatedSnsTopicArnExport_${id}`, { exportName: ExportNames.BillingPlanUpdatedSnsTopicArn, value: billingPlanUpdatedSnsTopic.topicArn }).value as string,

        createUserRequest: new CfnOutput(this, `CreateUserRequestSnsTopicArnExport_${id}`, { exportName: ExportNames.CreateUserRequestSnsTopicArn, value: createUserRequestSnsTopic.topicArn }).value as string,
      },
    };
  }
}

export interface YacUtilServiceProps extends StackProps {
  environment: string;
}

export interface YacUtilServiceExports {
  snsTopicArns: YacUtilServiceSnsTopicArnExports;
  s3BucketNames: YacUtilServiceS3BucketNameExports;
  secretArns: YacUtilServiceSecretArnExports;
  domainNameAttributes: YacUtilServiceDomainNameExports;
  hostedZoneAttributes: YacUtilServiceHostedZoneExports;
  certificateArn: string;
  slackClient: YacUtilServiceSlackClientExports;
  googleClient: YacUtilServiceGoogleClientExports;
  gcmServerKey: string;
  stripe: YacUtilServiceStripeExports;
  audoAi: YacUtilServiceAudoAiExports;
}

export interface YacUtilServiceSnsTopicArnExports {
  userCreated: string;
  organizationCreated: string;
  teamCreated: string;
  meetingCreated: string;
  groupCreated: string;

  userAddedToOrganization: string;
  userAddedToTeam: string;
  userAddedToGroup: string;
  userAddedToMeeting: string;
  userAddedAsFriend: string;

  userRemovedFromOrganization: string;
  userRemovedFromTeam: string;
  userRemovedFromGroup: string;
  userRemovedFromMeeting: string;
  userRemovedAsFriend: string;

  messageCreated: string;
  messageUpdated: string;

  messageTranscoded: string;
  messageTranscribed: string;

  billingPlanUpdated: string;

  createUserRequest: string;
}

export interface YacUtilServiceS3BucketNameExports {
  rawMessage: string;
  enhancedMessage: string;
}

export interface YacUtilServiceSecretArnExports {
  messageUploadToken: string;
}

export interface YacUtilServiceDomainNameExports {
  name: string;
  regionalDomainName: string;
  regionalHostedZoneId: string;
}

export interface YacUtilServiceHostedZoneExports {
  id: string;
  name: string;
}
export interface YacUtilServiceGoogleClientExports {
  id: string;
  secret: string
}

export interface YacUtilServiceSlackClientExports {
  id: string;
  secret: string
}

export interface YacUtilServiceAudoAiExports {
  apiKey: string;
}

export interface YacUtilServiceStripeExports {
  apiKey: string;
  freePlanProductId: string;
  paidPlanProductId: string;
  webhookSecret: string;
}
