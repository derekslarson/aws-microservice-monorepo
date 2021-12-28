/* eslint-disable no-new */
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { App, Fn } from "aws-cdk-lib";
import { YacNotificationServiceStack } from "./stacks/yac.notification.service.stack";

const app = new App();

const environment = app.node.tryGetContext("environment") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
}

const ExportNames = generateExportNames(environment);

new YacNotificationServiceStack(app, `${environment}-YacNotificationService`, {
  environment,
  authorizerHandlerFunctionArn: Fn.importValue(ExportNames.AuthorizerHandlerFunctionArn),
  certificateArn: Fn.importValue(ExportNames.CertificateArn),
  gcmServerKey: Fn.importValue(ExportNames.GcmServerKey),
  domainNameAttributes: {
    name: Fn.importValue(ExportNames.DomainNameName),
    regionalDomainName: Fn.importValue(ExportNames.DomainNameRegionalDomainName),
    regionalHostedZoneId: Fn.importValue(ExportNames.DomainNameRegionalHostedZoneId),
  },
  hostedZoneAttributes: {
    hostedZoneId: Fn.importValue(ExportNames.HostedZoneId),
    zoneName: Fn.importValue(ExportNames.HostedZoneName),
  },
  snsTopicArns: {
    userCreated: Fn.importValue(ExportNames.UserCreatedSnsTopicArn),
    organizationCreated: Fn.importValue(ExportNames.OrganizationCreatedSnsTopicArn),
    teamCreated: Fn.importValue(ExportNames.TeamCreatedSnsTopicArn),
    meetingCreated: Fn.importValue(ExportNames.MeetingCreatedSnsTopicArn),
    groupCreated: Fn.importValue(ExportNames.GroupCreatedSnsTopicArn),

    userAddedToOrganization: Fn.importValue(ExportNames.UserAddedToOrganizationSnsTopicArn),
    userAddedToTeam: Fn.importValue(ExportNames.UserAddedToTeamSnsTopicArn),
    userAddedToGroup: Fn.importValue(ExportNames.UserAddedToGroupSnsTopicArn),
    userAddedToMeeting: Fn.importValue(ExportNames.UserAddedToMeetingSnsTopicArn),
    userAddedAsFriend: Fn.importValue(ExportNames.UserAddedAsFriendSnsTopicArn),

    userRemovedFromOrganization: Fn.importValue(ExportNames.UserRemovedFromOrganizationSnsTopicArn),
    userRemovedFromTeam: Fn.importValue(ExportNames.UserRemovedFromTeamSnsTopicArn),
    userRemovedFromGroup: Fn.importValue(ExportNames.UserRemovedFromGroupSnsTopicArn),
    userRemovedFromMeeting: Fn.importValue(ExportNames.UserRemovedFromMeetingSnsTopicArn),
    userRemovedAsFriend: Fn.importValue(ExportNames.UserRemovedAsFriendSnsTopicArn),

    messageCreated: Fn.importValue(ExportNames.MessageCreatedSnsTopicArn),
    messageUpdated: Fn.importValue(ExportNames.MessageUpdatedSnsTopicArn),
    messageTranscoded: Fn.importValue(ExportNames.MessageTranscodedSnsTopicArn),
    messageTranscribed: Fn.importValue(ExportNames.MessageTranscribedSnsTopicArn),
  },
});
