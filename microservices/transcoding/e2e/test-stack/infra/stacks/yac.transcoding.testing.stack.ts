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
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as ApiGatewayV2Integrations from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { HttpApi } from "@yac/util/infra/constructs/http.api";

export class YacTranscodingTestingStack extends Stack {
  constructor(scope: Construct, id: string, props: YacTranscodingTestingStackProps) {
    super(scope, id, props);

    const { environment, domainName, snsTopics } = props;

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

    // SNS Event Lambda Handler
    new Lambda.Function(this, `SnsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/snsEvent`),
      handler: "snsEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, testingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.SnsEventSource(snsTopics.messageTranscoded),
      ],
    });

    const httpEventHandler = new Lambda.Function(this, `HttpEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/httpEvent`),
      handler: "httpEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, testingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });


    new HttpApi(this, `TestingApi_${id}`, {
      serviceName: "transcoding-testing",
      domainName,
      defaultIntegration: new ApiGatewayV2Integrations.HttpLambdaIntegration(`DefaultIntegration_${id}`, httpEventHandler),
    })
    
    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `TranscodingTestingTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${environment}/transcoding-testing-table-name`,
      stringValue: testingTable.tableName,
    });
  }
}

export interface YacTranscodingTestingStackProps extends StackProps {
  environment: string;
  domainName: ApiGatewayV2.IDomainName;
  snsTopics: {
    messageTranscoded: SNS.ITopic;
  }
}