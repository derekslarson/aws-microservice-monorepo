/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-new */

import * as CDK from "@aws-cdk/core";
import * as ACM from "@aws-cdk/aws-certificatemanager";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as SSM from "@aws-cdk/aws-ssm";
import * as Route53 from "@aws-cdk/aws-route53";
import * as Route53Targets from "@aws-cdk/aws-route53-targets";
import * as SNS from "@aws-cdk/aws-sns";
import * as Cognito from "@aws-cdk/aws-cognito";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as S3 from "@aws-cdk/aws-s3";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as IAM from "@aws-cdk/aws-iam";
import { generateExportNames } from "../../src/enums/exportNames.enum";
import { Environment } from "../../src/enums/environment.enum";

export class YacCoreServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const hostedZoneName = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-name`);
    const hostedZoneId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-id`);
    const certificateArn = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/certificate-arn`);

    const ExportNames = generateExportNames(environment === Environment.Local ? developer : environment);

    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    const certificate = ACM.Certificate.fromCertificateArn(this, `${id}-cert`, certificateArn);

    const hostedZone = Route53.HostedZone.fromHostedZoneAttributes(this, `${id}-HostedZone`, {
      zoneName: hostedZoneName,
      hostedZoneId,
    });

    const domainName = new ApiGatewayV2.DomainName(this, `${id}-DN`, { domainName: `${this.recordName}.${hostedZoneName}`, certificate });

    new Route53.ARecord(this, "ApiRecord", {
      zone: hostedZone,
      recordName: this.recordName,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.ApiGatewayv2Domain(domainName)),
    });

    // User Pool and Yac Client
    const userPool = new Cognito.UserPool(this, `${id}UserPool`, {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { email: true },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
      customAttributes: { authChallenge: new Cognito.StringAttribute({ mutable: true }) },
    });

    const adminPolicyStatement = new IAM.PolicyStatement({
      actions: [ "*" ],
      resources: [ "*" ],
    });

    const messageS3Bucket = new S3.Bucket(this, `MessageS3Bucket-${id}`, {});

    const clientsUpdatedSnsTopic = new SNS.Topic(this, `${id}-ClientsUpdatedSnsTopic`, { topicName: `${id}-ClientsUpdatedSnsTopic` });
    const userSignedUpSnsTopic = new SNS.Topic(this, `${id}-UserSignedUpSnsTopic`, { topicName: `${id}-UserSignedUpSnsTopic` });

    new Lambda.Function(this, `${id}-SetAuthorizerAudiencesHandler`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/setAuthorizerAudiences"),
      handler: "setAuthorizerAudiences.handler",
      layers: [ dependencyLayer ],
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        STACK_PREFIX: stackPrefix,
      },
      timeout: CDK.Duration.seconds(15),
      initialPolicy: [ adminPolicyStatement ],
      events: [
        new LambdaEventSources.SnsEventSource(clientsUpdatedSnsTopic),
      ],
    });

    const coreTable = new DynamoDB.Table(this, `${id}-CoreTable`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
    });

    new SSM.StringParameter(this, `UserPoolIdSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-pool-id`,
      stringValue: userPool.userPoolId,
    });

    new CDK.CfnOutput(this, `${id}-CustomDomainNameExport`, {
      exportName: ExportNames.CustomDomainName,
      value: domainName.name,
    });

    new CDK.CfnOutput(this, `${id}-RegionalDomainNameExport`, {
      exportName: ExportNames.RegionalDomainName,
      value: domainName.regionalDomainName,
    });

    new CDK.CfnOutput(this, `${id}-RegionalHostedZoneIdExport`, {
      exportName: ExportNames.RegionalHostedZoneId,
      value: domainName.regionalHostedZoneId,
    });

    new CDK.CfnOutput(this, `${id}-UserPoolIdExport`, {
      exportName: ExportNames.UserPoolId,
      value: userPool.userPoolId,
    });

    new CDK.CfnOutput(this, `${id}-ClientsUpdatedSnsTopicExport`, {
      exportName: ExportNames.ClientsUpdatedSnsTopicArn,
      value: clientsUpdatedSnsTopic.topicArn,
    });

    new CDK.CfnOutput(this, `${id}-UserSignedUpSnsTopicExport`, {
      exportName: ExportNames.UserSignedUpSnsTopicArn,
      value: userSignedUpSnsTopic.topicArn,
    });

    new CDK.CfnOutput(this, `${id}-CoreTableNameExport`, {
      exportName: ExportNames.CoreTableName,
      value: coreTable.tableName,
    });

    new CDK.CfnOutput(this, `${id}-MessageS3BucketArnExport`, {
      exportName: ExportNames.MessageS3BucketArn,
      value: messageS3Bucket.bucketArn,
    });
  }

  public get recordName(): string {
    try {
      const environment = this.node.tryGetContext("environment") as string;
      const developer = this.node.tryGetContext("developer") as string;

      if (environment === Environment.Prod) {
        return "api-v4";
      }

      if (environment === Environment.Dev) {
        return "develop";
      }

      if (environment === Environment.Local) {
        return developer;
      }

      return environment;
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in YacCoreServiceStackg recordName getter:\n`, error);

      throw error;
    }
  }
}
