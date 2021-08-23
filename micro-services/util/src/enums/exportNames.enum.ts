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
  GroupCreatedSnsTopicArn: "groupCreatedSnsTopicArn",
  FriendMessageCreatedSnsTopicArn: "friendMessageCreatedSnsTopicArn",
  FriendMessageUpdatedSnsTopicArn: "friendMessageUpdatedSnsTopicArn",
  GroupMessageCreatedSnsTopicArn: "groupMessageCreatedSnsTopicArn",
  GroupMessageUpdatedSnsTopicArn: "groupMessageUpdatedSnsTopicArn",
  MeetingMessageCreatedSnsTopicArn: "meetingMessageCreatedSnsTopicArn",
  CoreTableName: "coreTableName",
  MessageS3BucketArn: "messageS3BucketArn",
};

export function generateExportNames(id: string): Readonly<typeof ExportNames> {
  const exportNamesCopy = { ...ExportNames };

  return Object.freeze(Object.entries(exportNamesCopy).reduce((acc, [ key, val ]) => {
    acc[key as keyof typeof ExportNames] = `${id}-${val}`;

    return acc;
  }, exportNamesCopy));
}
