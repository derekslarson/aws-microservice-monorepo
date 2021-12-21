/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as IAM from "@aws-cdk/aws-iam";
import * as SSM from "@aws-cdk/aws-ssm";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as S3 from "@aws-cdk/aws-s3";
import { Environment, generateExportNames, LogLevel } from "@yac/util";
import * as S3Notifications from "@aws-cdk/aws-s3-notifications";

export class YacTranscodingServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    // SSM Imports
    const audoAiApiKey = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/audo-ai-api-key`);

    const ExportNames = generateExportNames(stackPrefix);

    // SNS Topic ARN Imports from Util
    const messageTranscodedSnsTopicArn = CDK.Fn.importValue(ExportNames.MessageTranscodedSnsTopicArn);

    // S3 Bucket ARN Imports from Util
    const rawMessageS3BucketArn = CDK.Fn.importValue(ExportNames.RawMessageS3BucketArn);
    const enhancedMessageS3BucketArn = CDK.Fn.importValue(ExportNames.EnhancedMessageS3BucketArn);

    // S3 Buckets
    const rawMessageS3Bucket = S3.Bucket.fromBucketArn(this, `RawMessageS3Bucket_${id}`, rawMessageS3BucketArn);
    const enhancedMessageS3Bucket = S3.Bucket.fromBucketArn(this, `EnhancedMessageS3Bucket_${id}`, enhancedMessageS3BucketArn);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const rawMessageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ rawMessageS3Bucket.bucketArn, `${rawMessageS3Bucket.bucketArn}/*` ],
    });

    const enhancedMessageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ enhancedMessageS3Bucket.bucketArn, `${enhancedMessageS3Bucket.bucketArn}/*` ],
    });

    const messageTranscodedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ messageTranscodedSnsTopicArn ],
    });

    // const mockHttpIntegrationDomain = `https://${developer}.yacchat.com/transcoding-testing`;

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      AUDO_AI_API_DOMAIN: "https://api.audo.ai",
      AUDO_AI_API_KEY: audoAiApiKey,
      RAW_MESSAGE_S3_BUCKET_NAME: rawMessageS3Bucket.bucketName,
      ENHANCED_MESSAGE_S3_BUCKET_NAME: enhancedMessageS3Bucket.bucketName,
      MESSAGE_TRANSCODED_SNS_TOPIC_ARN: messageTranscodedSnsTopicArn,

    };

    // Lambdas
    const s3EventHandler = new Lambda.Function(this, `S3EventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/s3Event"),
      handler: "s3Event.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, rawMessageS3BucketFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, messageTranscodedSnsPublishPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    rawMessageS3Bucket.addObjectCreatedNotification(new S3Notifications.LambdaDestination(s3EventHandler));
    enhancedMessageS3Bucket.addObjectCreatedNotification(new S3Notifications.LambdaDestination(s3EventHandler));
  }
}
