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

export class YacNotificationTestingStack extends Stack {
  constructor(scope: Construct, id: string, props: YacNotificationTestingStackProps) {
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
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `PushNotificationFailedSnsTopic_${id}`, snsTopicArns.pushNotificationFailed)),
      ],
    });

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `ListenerMappingTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${environment}/notification-testing-sns-event-table-name`,
      stringValue: snsEventTable.tableName,
    });
  }
}

export interface YacNotificationTestingStackProps extends StackProps {
  environment: string;
  snsTopicArns: {
    pushNotificationFailed: string;
  }
}