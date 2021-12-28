import { App, Fn } from "aws-cdk-lib";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { YacCoreTestingStack } from "./stacks/yac.core.testing.stack";

const app = new App();

const environment = app.node.tryGetContext("environment") as string;

if (!environment) {
  throw new Error("'environment' context param required.");
}

const ExportNames = generateExportNames(environment);

// eslint-disable-next-line no-new
new YacCoreTestingStack(app, `${environment}-YacCoreTesting`, {
  environment,
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
  },
});
