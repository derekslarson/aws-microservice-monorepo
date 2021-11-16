/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as IAM from "@aws-cdk/aws-iam";
import * as SSM from "@aws-cdk/aws-ssm";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as S3 from "@aws-cdk/aws-s3";
import * as SNS from "@aws-cdk/aws-sns";
import * as SNSSubscriptions from "@aws-cdk/aws-sns-subscriptions";
import * as SQS from "@aws-cdk/aws-sqs";
import * as EventBridge from "@aws-cdk/aws-events";
import * as EventBridgeTargets from "@aws-cdk/aws-events-targets";
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

    // SNS Topics
    const messageTranscodedSnsTopic = SNS.Topic.fromTopicArn(this, `MessageTranscodedSnsTopic_${id}`, messageTranscodedSnsTopicArn)
    const transcriptionJobCompletedSnsTopic = new SNS.Topic(this, `TranscriptionJobCompleted_${id}`, { topicName: `TranscriptionJobCompleted_${id}` });
    const transcriptionJobFailedSnsTopic = new SNS.Topic(this, `TranscriptionJobFailed_${id}`, { topicName: `TranscriptionJobFailed_${id}` });

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
      ENVIRONMENT: stackPrefix,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      AUDO_AI_API_DOMAIN: "https://api.audo.ai",
      AUDO_AI_API_KEY: audoAiApiKey,
      MESSAGE_S3_BUCKET_NAME: enhancedMessageS3Bucket.bucketName,
      TRANSCRIPTION_S3_BUCKET_NAME: transcriptionS3Bucket.bucketName,
      MESSAGE_TRANSCODED_SNS_TOPIC_ARN: messageTranscodedSnsTopicArn,
      MESSAGE_TRANSCRIBED_SNS_TOPIC_ARN: messageTranscribedSnsTopicArn,
      TRANSCRIPTION_JOB_COMPLETED_SNS_TOPIC_ARN: transcriptionJobCompletedSnsTopic.topicArn,
      TRANSCRIPTION_JOB_FAILED_SNS_TOPIC_ARN: transcriptionJobFailedSnsTopic.topicArn,

    };

    // SQS Queues
    const sqsEventHandlerQueue = new SQS.Queue(this, `SqsEventHandlerQueue_${id}`);
    messageTranscodedSnsTopic.addSubscription(new SNSSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    transcriptionJobCompletedSnsTopic.addSubscription(new SNSSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    transcriptionJobFailedSnsTopic.addSubscription(new SNSSubscriptions.SqsSubscription(sqsEventHandlerQueue));

    // Lambdas
    new Lambda.Function(this, `SqsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/sqsEvent"),
      handler: "sqsEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, enhancedMessageS3BucketFullAccessPolicyStatement, transcriptionS3BucketFullAccessPolicyStatement, startTranscriptionJobPolicyStatement, messageTranscribedSnsPublishPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SqsEventSource(sqsEventHandlerQueue),
      ],
    });

    new EventBridge.Rule(this, `TranscriptionJobCompletedEvent_${id}`, {
      targets: [ new EventBridgeTargets.SnsTopic(transcriptionJobCompletedSnsTopic) ],
      eventPattern: {
        source: [ "aws.transcribe" ],
        detailType: [ "Transcribe Job State Change" ],
        detail: {
          TranscriptionJobName: [ { prefix: `${stackPrefix}_` } ],
          TranscriptionJobStatus: [ "COMPLETED" ],
        },
      },
    });

    new EventBridge.Rule(this, `TranscriptionJobFailedEvent_${id}`, {
      targets: [ new EventBridgeTargets.SnsTopic(transcriptionJobCompletedSnsTopic) ],
      eventPattern: {
        source: [ "aws.transcribe" ],
        detailType: [ "Transcribe Job State Change" ],
        detail: {
          TranscriptionJobName: [ { prefix: `${stackPrefix}_` } ],
          TranscriptionJobStatus: [ "FAILED" ],
        },
      },
    });

    new SSM.StringParameter(this, `TranscriptionS3BucketNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/transcription-s3-bucket-name`,
      stringValue: transcriptionS3Bucket.bucketName,
    });

    new SSM.StringParameter(this, `TranscriptionJobCompletedSnsTopicArnSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/transcription-job-completed-sns-topic-arn`,
      stringValue: transcriptionJobCompletedSnsTopic.topicArn,
    });

    new SSM.StringParameter(this, `TranscriptionJobFailedSnsTopicArnSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/transcription-job-failed-sns-topic-arn`,
      stringValue: transcriptionJobFailedSnsTopic.topicArn,
    });
  }
}
