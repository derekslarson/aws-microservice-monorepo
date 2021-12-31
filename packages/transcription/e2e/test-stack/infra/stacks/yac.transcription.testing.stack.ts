/* eslint-disable no-new */
import {
  Stack,
  StackProps,
  RemovalPolicy,
  aws_iam as IAM,
  aws_lambda_event_sources as LambdaEventSources,
  aws_sns as SNS,
  aws_dynamodb as DynamoDB,
  aws_ssm as SSM,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Function } from "@yac/util/infra/constructs/lambda.function";

export class YacTranscriptionTestingStack extends Stack {
  constructor(scope: Construct, id: string, props: YacTranscriptionTestingStackProps) {
    super(scope, id, { stackName: id, ...props });

    const { environment, snsTopicArns } = props;
        
    // Databases
    const testingTable = new DynamoDB.Table(this, `TestingTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const testingTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ testingTable.tableArn, `${testingTable.tableArn}/*` ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = { TESTING_TABLE_NAME: testingTable.tableName };

    // SNS Event Lambda 
    new Function(this, `SnsEventHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/snsEvent`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, testingTableFullAccessPolicyStatement ],
      events: [
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `MessageTranscribedSnsTopic_${id}`, snsTopicArns.messageTranscribed)),
      ],
    });

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `TranscriptionTestingTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${environment}/transcription-testing-table-name`,
      stringValue: testingTable.tableName,
    });
  }
}

export interface YacTranscriptionTestingStackProps extends StackProps {
  environment: string;
  snsTopicArns: {
    messageTranscribed: string;
  }
}
