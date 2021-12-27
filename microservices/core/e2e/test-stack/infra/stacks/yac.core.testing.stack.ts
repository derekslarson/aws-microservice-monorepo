/* eslint-disable no-new */
import {
  RemovalPolicy,
  Duration,
  Stack,
  StackProps,
  aws_ssm as SSM,
  aws_sns as SNS,
  aws_dynamodb as DynamoDB,
  aws_iam as IAM,
  aws_lambda as Lambda,
  aws_lambda_event_sources as LambdaEventSources,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class YacCoreTestingStack extends Stack {
  constructor(scope: Construct, id: string, props: YacCoreTestingStackProps) {
    super(scope, id, props);

    const { environment, snsTopics } = props;
 
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
    new Lambda.Function(this, `SnsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/snsEvent`),
      handler: "snsEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, snsEventTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.SnsEventSource(snsTopics.userAddedToTeam),
        new LambdaEventSources.SnsEventSource(snsTopics.userRemovedFromTeam),
        new LambdaEventSources.SnsEventSource(snsTopics.userAddedToGroup),
        new LambdaEventSources.SnsEventSource(snsTopics.userRemovedFromGroup),
        new LambdaEventSources.SnsEventSource(snsTopics.userAddedToMeeting),
        new LambdaEventSources.SnsEventSource(snsTopics.userRemovedFromMeeting),
        new LambdaEventSources.SnsEventSource(snsTopics.userAddedAsFriend),
        new LambdaEventSources.SnsEventSource(snsTopics.userRemovedAsFriend),
        new LambdaEventSources.SnsEventSource(snsTopics.teamCreated),
        new LambdaEventSources.SnsEventSource(snsTopics.meetingCreated),
        new LambdaEventSources.SnsEventSource(snsTopics.groupCreated),
        new LambdaEventSources.SnsEventSource(snsTopics.messageCreated),
        new LambdaEventSources.SnsEventSource(snsTopics.messageUpdated),
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
  snsTopics: {
    userCreated: SNS.Topic;
    organizationCreated: SNS.Topic;
    teamCreated: SNS.Topic;
    meetingCreated: SNS.Topic;
    groupCreated: SNS.Topic;

    userAddedToOrganization: SNS.Topic;
    userAddedToTeam: SNS.Topic;
    userAddedToGroup: SNS.Topic;
    userAddedToMeeting: SNS.Topic;
    userAddedAsFriend: SNS.Topic;

    userRemovedFromOrganization: SNS.Topic;
    userRemovedFromTeam: SNS.Topic;
    userRemovedFromGroup: SNS.Topic;
    userRemovedFromMeeting: SNS.Topic;
    userRemovedAsFriend: SNS.Topic;

    messageCreated: SNS.Topic;
    messageUpdated: SNS.Topic;
  }
}