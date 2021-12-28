import { App, Fn } from "aws-cdk-lib";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { YacCoreServiceStack } from "./stacks/yac.core.service.stack";

const app = new App();

const environment = process.env.BUILD_ENV;

if (!environment) {
  throw new Error("'BUILD_ENV' environment variable required.");
}

const ExportNames = generateExportNames(environment);

// eslint-disable-next-line no-new
new YacCoreServiceStack(app, `${environment}-YacCoreService`, {
  environment,
  authorizerHandlerFunctionArn: Fn.importValue(ExportNames.AuthorizerHandlerFunctionArn),
  domainNameAttributes: {
    name: Fn.importValue(ExportNames.DomainNameName),
    regionalDomainName: Fn.importValue(ExportNames.DomainNameRegionalDomainName),
    regionalHostedZoneId: Fn.importValue(ExportNames.DomainNameRegionalHostedZoneId),
  },
  secretArns: { messageUploadToken: Fn.importValue(ExportNames.MessageUploadTokenSecretArn) },
  s3BucketArns: {
    rawMessage: Fn.importValue(ExportNames.RawMessageS3BucketArn),
    enhancedMessage: Fn.importValue(ExportNames.EnhancedMessageS3BucketArn),
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

    billingPlanUpdated: Fn.importValue(ExportNames.BillingPlanUpdatedSnsTopicArn),

    createUserRequest: Fn.importValue(ExportNames.CreateUserRequestSnsTopicArn),
  },
});
