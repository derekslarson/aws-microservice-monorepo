/* eslint-disable no-new */
import {
  RemovalPolicy,
  Stack,
  StackProps,
  aws_ssm as SSM,
  aws_sns as SNS,
  aws_dynamodb as DynamoDB,
  aws_iam as IAM,
  aws_lambda_event_sources as LambdaEventSources,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Function } from "@yac/util/infra/constructs/lambda.function";

export class YacCoreTestingStack extends Stack {
  constructor(scope: Construct, id: string, props: YacCoreTestingStackProps) {
    super(scope, id, { stackName: id, ...props });

    const { environment, snsTopicArns } = props;
 
    // Databases
    const snsEventTable = new DynamoDB.Table(this, `SnsEventTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const snsEventTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ snsEventTable.tableArn, `${snsEventTable.tableArn}/*` ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = { SNS_EVENT_TABLE_NAME: snsEventTable.tableName };

    // SNS Event Lambda Handler
    new Function(this, `SnsEventHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/snsEvent`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, snsEventTableFullAccessPolicyStatement ],
      events: [
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserAddedToTeamSnsTopic_${id}`, snsTopicArns.userAddedToTeam)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserRemovedFromTeamSnsTopic_${id}`, snsTopicArns.userRemovedFromTeam)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserAddedToGroupSnsTopic_${id}`, snsTopicArns.userAddedToGroup)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserRemovedFromGroupSnsTopic_${id}`, snsTopicArns.userRemovedFromGroup)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserAddedToMeetingSnsTopic_${id}`, snsTopicArns.userAddedToMeeting)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserRemovedFromMeetingSnsTopic_${id}`, snsTopicArns.userRemovedFromMeeting)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserAddedAsFriendSnsTopic_${id}`, snsTopicArns.userAddedAsFriend)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserRemovedAsFriendSnsTopic_${id}`, snsTopicArns.userRemovedAsFriend)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `TeamCreatedSnsTopic_${id}`, snsTopicArns.teamCreated)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `MeetingCreatedSnsTopic_${id}`, snsTopicArns.meetingCreated)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `GroupCreatedSnsTopic_${id}`, snsTopicArns.groupCreated)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `MessageCreatedSnsTopic_${id}`, snsTopicArns.messageCreated)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `MessageUpdatedSnsTopic_${id}`, snsTopicArns.messageUpdated)),
      ],
    });

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `ListenerMappingTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${environment}/core-testing-sns-event-table-name`,
      stringValue: snsEventTable.tableName,
    });
  }
}

export interface YacCoreTestingStackProps extends StackProps {
  environment: string;
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
  }
}