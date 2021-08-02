/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import { Environment, generateExportNames, LogLevel } from "@yac/util";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import { WebSocketApi } from "../constructs/webSocketApi.construct";
import { LambdaWebSocketIntegration } from "../constructs/lambdaWebSocketIntegration.construct";

export class YacNotificationServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);
    const customDomainName = CDK.Fn.importValue(ExportNames.CustomDomainName);
    const regionalDomainName = CDK.Fn.importValue(ExportNames.RegionalDomainName);
    const regionalHostedZoneId = CDK.Fn.importValue(ExportNames.RegionalHostedZoneId);

    const domainName = ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `DomainName_${id}`, {
      name: customDomainName,
      regionalDomainName,
      regionalHostedZoneId,
    });

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Databases
    const notificationMappingTable = new DynamoDB.Table(this, `NotificationMappingTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const notificationMappingTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ notificationMappingTable.tableArn, `${notificationMappingTable.tableArn}/*` ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      NOTIFICATION_MAPPING_TABLE_NAME: notificationMappingTable.tableName,
    };

    const connectHandler = new Lambda.Function(this, `ConnectHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/connect"),
      handler: "connect.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, notificationMappingTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const disconnectHandler = new Lambda.Function(this, `DisconnectHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/disconnect"),
      handler: "disconnect.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, notificationMappingTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const webSocketApi = new WebSocketApi(this, `WebSocketApi_${id}`, {
      connectRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: connectHandler }) },
      disconnectRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: disconnectHandler }) },
    });

    new ApiGatewayV2.WebSocketStage(this, `WebSocketApiStage_${id}`, {
      webSocketApi,
      stageName: "websocket",
      autoDeploy: true,
      domainMapping: {
        domainName,
        mappingKey: "notification",
      },
    });
  }
}
