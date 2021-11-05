const ExportNames = {
  MessageCreatedSnsTopicArn: "messageCreatedSnsTopicArn",
  UserPoolId: "userPoolId",
  YacUserPoolClientId: "yacUserPoolClientId",
  YacUserPoolClientSecret: "yacUserPoolClientSecret",
  YacUserPoolClientRedirectUri: "yacUserPoolClientRedirectUri",
  CustomDomainName: "customDomainName",
  RegionalDomainName: "regionalDomainName",
  RegionalHostedZoneId: "regionalHostedZoneId",
  ClientsUpdatedSnsTopicArn: "clientsUpdatedSnsTopicArn",
  UserSignedUpSnsTopicArn: "userSignedUpSnsTopicArn",
  UserCreatedSnsTopicArn: "userCreatedSnsTopicArn",
  UserAddedToTeamSnsTopicArn: "userAddedToTeamSnsTopicArn",
  UserRemovedFromTeamSnsTopicArn: "userRemovedFromTeamSnsTopicArn",
  UserAddedToGroupSnsTopicArn: "userAddedToGroupSnsTopicArn",
  UserRemovedFromGroupSnsTopicArn: "userRemovedFromGroupSnsTopicArn",
  UserAddedToMeetingSnsTopicArn: "userAddedToMeetingSnsTopicArn",
  UserRemovedFromMeetingSnsTopicArn: "userRemovedFromMeetingSnsTopicArn",
  UserAddedAsFriendSnsTopicArn: "userAddedAsFriendSnsTopicArn",
  UserRemovedAsFriendSnsTopicArn: "userRemovedAsFriendSnsTopicArn",
  TeamCreatedSnsTopicArn: "teamCreatedSnsTopicArn",
  MeetingCreatedSnsTopicArn: "meetingCreatedSnsTopicArn",
  GroupCreatedSnsTopicArn: "groupCreatedSnsTopicArn",
  FriendMessageCreatedSnsTopicArn: "friendMessageCreatedSnsTopicArn",
  FriendMessageUpdatedSnsTopicArn: "friendMessageUpdatedSnsTopicArn",
  GroupMessageCreatedSnsTopicArn: "groupMessageCreatedSnsTopicArn",
  GroupMessageUpdatedSnsTopicArn: "groupMessageUpdatedSnsTopicArn",
  MeetingMessageCreatedSnsTopicArn: "meetingMessageCreatedSnsTopicArn",
  MeetingMessageUpdatedSnsTopicArn: "meetingMessageUpdatedSnsTopicArn",
  PushNotificationFailedSnsTopicArn: "pushNotificationFailedSnsTopicArn",
  MessageTranscodedSnsTopicArn: "messageTranscodedSnsTopicArn",
  MessageTranscribedSnsTopicArn: "messageTranscribedSnsTopicArn",
  CoreTableName: "coreTableName",
  MessageS3BucketArn: "messageS3BucketArn",
  RawMessageS3BucketArn: "rawMessageS3BucketArn",
  EnhancedMessageS3BucketArn: "enhancedMessageS3BucketArn",
  MessageUploadTokenSecretArn: "messageUploadTokenSecretArn",
  ChunkedUploadsFSId: "chunkedUploadsFSId",
  ChunkedUploadsFSAccessPointId: "chunkedUploadsFsAccesPointId",
  ChunkedUploadsFSMountedPath: "chunkedUploadsFSMountedPath",
  ChunkedUploadsVPCId: "chunkedUploadsVPCId",
  ChunkedUploadsVPCAvailabilityZone: "chunkedUploadsVPCAvailabilityZones",
  ChunkedUploadsVPCSecurityGroupSSM: "chunkedUploadsVPCSecurityGroupSSM",
  ExternalProviderUserSignedUpSnsTopicArn: "externalProviderUserSignedUpSnsTopicArn",
  AuthorizerHandlerFunctionArn: "authorizerHandlerFunctionArn",
};

export function generateExportNames(id: string): Readonly<typeof ExportNames> {
  const exportNamesCopy = { ...ExportNames };

  return Object.freeze(Object.entries(exportNamesCopy).reduce((acc, [ key, val ]) => {
    acc[key as keyof typeof ExportNames] = `${id}-${val}`;

    return acc;
  }, exportNamesCopy));
}
