/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as SNS from "@aws-cdk/aws-sns";
import * as SSM from "@aws-cdk/aws-ssm";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as ApiGatewayV2Integrations from "@aws-cdk/aws-apigatewayv2-integrations";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import { Environment, generateExportNames } from "@yac/util";

export class YacTranscodingTestingStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    // Imported Domain Name Related Resources from Util stack
    const customDomainName = CDK.Fn.importValue(ExportNames.CustomDomainName);
    const regionalDomainName = CDK.Fn.importValue(ExportNames.RegionalDomainName);
    const regionalHostedZoneId = CDK.Fn.importValue(ExportNames.RegionalHostedZoneId);

    // Imported SNS Topic ARNs from Util stack
    const messageTranscodedSnsTopicArn = CDK.Fn.importValue(ExportNames.MessageTranscodedSnsTopicArn);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });
        
    // Databases
    const testingTable = new DynamoDB.Table(this, `TestingTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
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
      code: Lambda.Code.fromAsset("dist/handlers/snsEvent"),
      handler: "snsEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, testingTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `MessageTranscodedSnsTopic_${id}`, messageTranscodedSnsTopicArn)),
      ],
    });

    const httpEventHandler = new Lambda.Function(this, `HttpEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/httpEvent"),
      handler: "httpEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, testingTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const domainName = ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `DomainName_${id}`, {
      name: customDomainName,
      regionalDomainName,
      regionalHostedZoneId,
    });

    new ApiGatewayV2.HttpApi(this, `TestingApi_${id}`, {
      defaultIntegration: new ApiGatewayV2Integrations.LambdaProxyIntegration({ handler: httpEventHandler }),
      defaultDomainMapping: {
        domainName: domainName,
        mappingKey: "transcoding-testing"
      }
    })
    
    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `TranscodingTestingTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/transcoding-testing-table-name`,
      stringValue: testingTable.tableName,
    });
  }
}
