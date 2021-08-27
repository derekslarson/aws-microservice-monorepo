/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as IAM from "@aws-cdk/aws-iam";
import * as SSM from "@aws-cdk/aws-ssm";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as S3 from "@aws-cdk/aws-s3";
import * as SNS from "@aws-cdk/aws-sns";
import { Environment, generateExportNames, LogLevel } from "@yac/util";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";

export class YacTranscriptionServiceStack extends CDK.Stack {
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
    const messageTranscribedSnsTopicArn = CDK.Fn.importValue(ExportNames.MessageTranscribedSnsTopicArn);

    // S3 Bucket ARN Imports from Util
    const enhancedMessageS3BucketArn = CDK.Fn.importValue(ExportNames.EnhancedMessageS3BucketArn);

    // S3 Buckets
    const enhancedMessageS3Bucket = S3.Bucket.fromBucketArn(this, `EnhancedMessageS3Bucket_${id}`, enhancedMessageS3BucketArn);
    const transcriptionS3Bucket = new S3.Bucket(this, `TranscriptionS3Bucket_${id}`, { ...(environment !== Environment.Prod && { removalPolicy: CDK.RemovalPolicy.DESTROY }) });

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const enhancedMessageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ enhancedMessageS3Bucket.bucketArn, `${enhancedMessageS3Bucket.bucketArn}/*` ],
    });

    const transcriptionS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ transcriptionS3Bucket.bucketArn, `${transcriptionS3Bucket.bucketArn}/*` ],
    });

    const startTranscriptionJobPolicyStatement = new IAM.PolicyStatement({
      actions: [ "transcribe:StartTranscriptionJob" ],
      resources: [ "*" ],
    });

    const messageTranscribedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ messageTranscribedSnsTopicArn ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      AUDO_AI_API_DOMAIN: "https://api.audo.ai",
      AUDO_AI_API_KEY: audoAiApiKey,
      MESSAGE_S3_BUCKET_NAME: enhancedMessageS3Bucket.bucketName,
      TRANSCRIPTION_S3_BUCKET_NAME: transcriptionS3Bucket.bucketName,
      MESSAGE_TRANSCODED_SNS_TOPIC_ARN: messageTranscodedSnsTopicArn,
      MESSAGE_TRANSCRIBED_SNS_TOPIC_ARN: messageTranscribedSnsTopicArn,

    };

    // Lambdas
    new Lambda.Function(this, `S3EventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/s3Event"),
      handler: "s3Event.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, transcriptionS3BucketFullAccessPolicyStatement, messageTranscribedSnsPublishPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.S3EventSource(transcriptionS3Bucket, { events: [ S3.EventType.OBJECT_CREATED ] }),
      ],
    });

    new Lambda.Function(this, `SnsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/snsEvent"),
      handler: "snsEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, enhancedMessageS3BucketFullAccessPolicyStatement, transcriptionS3BucketFullAccessPolicyStatement, startTranscriptionJobPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `MessageTranscodedSnsTopic_${id}`, messageTranscodedSnsTopicArn)),
      ],
    });
  }
}
