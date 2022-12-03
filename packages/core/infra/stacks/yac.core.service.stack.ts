/* eslint-disable no-nested-ternary */
/* eslint-disable no-new */
import {
  RemovalPolicy,
  Stack,
  StackProps,
  aws_ssm as SSM,
  aws_sns as SNS,
  aws_sns_subscriptions as SnsSubscriptions,
  aws_sqs as SQS,
  aws_ec2 as EC2,
  aws_dynamodb as DynamoDB,
  aws_iam as IAM,
  aws_s3 as S3,
  aws_lambda as Lambda,
  aws_lambda_event_sources as LambdaEventSources,
  aws_opensearchservice as OpenSearch,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";
import { HttpApi } from "@yac/util/infra/constructs/http.api";
import { Function } from "@yac/util/infra/constructs/lambda.function";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";
import { ChildStack, YacUserServiceNestedStack } from "./yac.user.service.nestedStack";
import { YacOrganizationServiceNestedStack } from "./yac.organization.service.nestedStack";
import { YacTeamServiceNestedStack } from "./yac.team.service.nestedStack";
import { YacGroupServiceNestedStack } from "./yac.group.service.nestedStack";
import { YacMeetingServiceNestedStack } from "./yac.meeting.service.nestedStack";
import { YacOneOnOneServiceNestedStack } from "./yac.oneOnOne.service.nestedStack";
import { YacMessageServiceNestedStack } from "./yac.message.service.nestedStack";
import { YacConversationServiceNestedStack } from "./yac.conversation.service.nestedStack";

export class YacCoreServiceStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const httpApi = new HttpApi(this, "HttpApi");

    new ChildStack(this, "ChildStack", httpApi);
  }
}

export interface YacCoreServiceStackProps extends StackProps {
  environment: string;
  domainNameAttributes: ApiGatewayV2.DomainNameAttributes;
  authorizerHandlerFunctionArn: string;
  secretArns: {
    messageUploadToken: string;
  };
  s3BucketArns: {
    rawMessage: string;
    enhancedMessage: string;
  };
  snsTopicArns: {
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
}
