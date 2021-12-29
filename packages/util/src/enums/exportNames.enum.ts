const ExportNames = {
  DomainNameName: "domainNameName",
  DomainNameRegionalDomainName: "domainNameRegionalDomainName",
  DomainNameRegionalHostedZoneId: "domainNameRegionalHostedZoneId",

  HostedZoneId: "hostedZoneId",
  HostedZoneName: "hostedZoneName",
  CertificateArn: "certificateArn",

  GoogleClientId: "googleClientId",
  GoogleClientSecret: "googleClientSecret",
  GcmServerKey: "gcmServerKey",

  SlackClientId: "slackClientId",
  SlackClientSecret: "slackClientSecret",

  StripeApiKey: "stripeApiKey",
  StripeFreePlanProductId: "stripeFreePlanProductId",
  StripePaidPlanProductId: "stripePaidPlanProductId",
  StripeWebhookSecret: "stripeWebhookSecret",

  AudoAiApiKey: "audoAiApiKey",

  UserCreatedSnsTopicArn: "userCreatedSnsTopicArn",
  OrganizationCreatedSnsTopicArn: "organizationCreatedSnsTopicArn",
  TeamCreatedSnsTopicArn: "teamCreatedSnsTopicArn",
  MeetingCreatedSnsTopicArn: "meetingCreatedSnsTopicArn",
  GroupCreatedSnsTopicArn: "groupCreatedSnsTopicArn",

  UserAddedToOrganizationSnsTopicArn: "userAddedToOrganizationSnsTopicArn",
  UserAddedToTeamSnsTopicArn: "userAddedToTeamSnsTopicArn",
  UserAddedToGroupSnsTopicArn: "userAddedToGroupSnsTopicArn",
  UserAddedToMeetingSnsTopicArn: "userAddedToMeetingSnsTopicArn",
  UserAddedAsFriendSnsTopicArn: "userAddedAsFriendSnsTopicArn",

  UserRemovedFromOrganizationSnsTopicArn: "userRemovedFromOrganizationSnsTopicArn",
  UserRemovedFromTeamSnsTopicArn: "userRemovedFromTeamSnsTopicArn",
  UserRemovedFromGroupSnsTopicArn: "userRemovedFromGroupSnsTopicArn",
  UserRemovedFromMeetingSnsTopicArn: "userRemovedFromMeetingSnsTopicArn",
  UserRemovedAsFriendSnsTopicArn: "userRemovedAsFriendSnsTopicArn",

  MessageCreatedSnsTopicArn: "MessageCreatedSnsTopicArn",
  MessageUpdatedSnsTopicArn: "MessageUpdatedSnsTopicArn",
  MessageTranscodedSnsTopicArn: "messageTranscodedSnsTopicArn",
  MessageTranscribedSnsTopicArn: "messageTranscribedSnsTopicArn",

  PushNotificationFailedSnsTopicArn: "pushNotificationFailedSnsTopicArn",

  CreateUserRequestSnsTopicArn: "createUserRequestSnsTopicArn",

  BillingPlanUpdatedSnsTopicArn: "billingPlanUpdatedSnsTopicArn",

  RawMessageS3BucketArn: "rawMessageS3BucketArn",
  EnhancedMessageS3BucketArn: "enhancedMessageS3BucketArn",

  MessageUploadTokenSecretArn: "messageUploadTokenSecretArn",

  AuthorizerHandlerFunctionArn: "authorizerHandlerFunctionArn",

  AuthTableName: "authTableName",

  ChunkedUploadVpcId: "chunkedUploadVpcId",
  ChunkedUploadVpcAvailabilityZones: "chunkedUploadVpcAvailabilityZones",
  ChunkedUploadVpcIsolatedSubnetIds: "chunkedUploadVpcIsolatedSubnetIds",
  ChunkedUploadFileSystemId: "chunkedUploadFileSystemId",
  ChunkedUploadFileSystemAccessPointId: "chunkedUploadFileSystemAccessPointId",
  ChunkedUploadFileSystemSecurityGroupId: "chunkedUploadFileSystemSecurityGroupId",
};

export function generateExportNames(environment: string): Readonly<typeof ExportNames> {
  const exportNamesCopy = { ...ExportNames };

  return Object.freeze(Object.entries(exportNamesCopy).reduce((acc, [ key, val ]) => {
    acc[key as keyof typeof ExportNames] = `${environment}-${val}`;

    return acc;
  }, exportNamesCopy));
}
