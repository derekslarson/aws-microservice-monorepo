/* eslint-disable no-new */
import {
  Duration,
  Stack,
  StackProps,
  RemovalPolicy,
  aws_iam as IAM,
  aws_lambda as Lambda,
  aws_lambda_event_sources as LambdaEventSources,
  aws_sns as SNS,
  aws_dynamodb as DynamoDB,
  aws_ssm as SSM,
} from "aws-cdk-lib";
import { Construct } from "constructs";
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
    new Lambda.Function(this, `SnsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/snsEvent`),
      handler: "snsEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, testingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
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
