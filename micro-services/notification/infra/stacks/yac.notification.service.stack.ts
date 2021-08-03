/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as SSM from "@aws-cdk/aws-ssm";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ACM from "@aws-cdk/aws-certificatemanager";
import * as Route53 from "@aws-cdk/aws-route53";
import * as Route53Targets from "@aws-cdk/aws-route53-targets";
import { Environment, generateExportNames, LogLevel } from "@yac/util";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import { WebSocketApi } from "../constructs/aws-apigatewayv2/webSocketApi.construct";
import { LambdaWebSocketIntegration } from "../constructs/aws-apigatewayv2-integrations/lambdaWebSocketIntegration.construct";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

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

    const userPoolId = CDK.Fn.importValue(ExportNames.UserPoolId);
    const hostedZoneName = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-name`);
    const hostedZoneId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-id`);
    const certificateArn = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/certificate-arn`);

    const certificate = ACM.Certificate.fromCertificateArn(this, `AcmCertificate_${id}`, certificateArn);

    const hostedZone = Route53.HostedZone.fromHostedZoneAttributes(this, `HostedZone_${id}`, {
      zoneName: hostedZoneName,
      hostedZoneId,
    });

    const domainName = new ApiGatewayV2.DomainName(this, `DomainName_${id}`, { domainName: `${this.recordName}.${hostedZoneName}`, certificate });

    new Route53.ARecord(this, `ARecord_${id}`, {
      zone: hostedZone,
      recordName: this.recordName,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.ApiGatewayv2DomainProperties(domainName.regionalDomainName, domainName.regionalHostedZoneId)),
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

    notificationMappingTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.One,
      partitionKey: { name: "gsi1pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: DynamoDB.AttributeType.STRING },
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
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      JWKS_URL: `https://cognito-idp.${this.region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
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

    new WebSocketApi(this, `WebSocketApi_${id}`, {
      connectRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: connectHandler }) },
      disconnectRouteOptions: { integration: new LambdaWebSocketIntegration({ handler: disconnectHandler }) },
      defaultDomainMapping: {
        domainName,
        mappingKey: "notification",
      },
    });
  }

  public get recordName(): string {
    try {
      const environment = this.node.tryGetContext("environment") as string;
      const developer = this.node.tryGetContext("developer") as string;

      if (environment === Environment.Prod) {
        return "api-v4-ws";
      }

      if (environment === Environment.Dev) {
        return "develop-ws";
      }

      if (environment === Environment.Local) {
        return `${developer}-ws`;
      }

      return environment;
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in YacNotificationService recordName getter:\n`, error);

      throw error;
    }
  }
}
