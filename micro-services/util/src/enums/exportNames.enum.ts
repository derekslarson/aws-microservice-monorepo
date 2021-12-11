const ExportNames = {
  CustomDomainName: "customDomainName",
  RegionalDomainName: "regionalDomainName",
  RegionalHostedZoneId: "regionalHostedZoneId",

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

  FriendMessageCreatedSnsTopicArn: "friendMessageCreatedSnsTopicArn",
  GroupMessageCreatedSnsTopicArn: "groupMessageCreatedSnsTopicArn",
  MeetingMessageCreatedSnsTopicArn: "meetingMessageCreatedSnsTopicArn",

  GroupMessageUpdatedSnsTopicArn: "groupMessageUpdatedSnsTopicArn",
  MeetingMessageUpdatedSnsTopicArn: "meetingMessageUpdatedSnsTopicArn",
  FriendMessageUpdatedSnsTopicArn: "friendMessageUpdatedSnsTopicArn",

  PushNotificationFailedSnsTopicArn: "pushNotificationFailedSnsTopicArn",

  MessageTranscodedSnsTopicArn: "messageTranscodedSnsTopicArn",
  MessageTranscribedSnsTopicArn: "messageTranscribedSnsTopicArn",

  CreateUserRequestSnsTopicArn: "createUserRequestSnsTopicArn",

  BillingPlanUpdatedSnsTopicArn: "billingPlanUpdatedSnsTopicArn",

  RawMessageS3BucketArn: "rawMessageS3BucketArn",
  EnhancedMessageS3BucketArn: "enhancedMessageS3BucketArn",

  MessageUploadTokenSecretArn: "messageUploadTokenSecretArn",

  ChunkedUploadsFSId: "chunkedUploadsFSId",
  ChunkedUploadsFSAccessPointId: "chunkedUploadsFsAccesPointId",
  ChunkedUploadsFSMountedPath: "chunkedUploadsFSMountedPath",
  ChunkedUploadsVPCId: "chunkedUploadsVPCId",
  ChunkedUploadsVPCAvailabilityZone: "chunkedUploadsVPCAvailabilityZones",
  ChunkedUploadsVPCSecurityGroupSSM: "chunkedUploadsVPCSecurityGroupSSM",

  AuthorizerHandlerFunctionArn: "authorizerHandlerFunctionArn",
};

export function generateExportNames(id: string): Readonly<typeof ExportNames> {
  const exportNamesCopy = { ...ExportNames };

  return Object.freeze(Object.entries(exportNamesCopy).reduce((acc, [ key, val ]) => {
    acc[key as keyof typeof ExportNames] = `${id}-${val}`;

    return acc;
  }, exportNamesCopy));
}
