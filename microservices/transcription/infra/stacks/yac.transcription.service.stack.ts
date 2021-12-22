/* eslint-disable no-new */
import {
  Fn,
  Duration,
  Stack,
  StackProps,
  RemovalPolicy,
  aws_iam as IAM,
  aws_lambda as Lambda,
  aws_lambda_event_sources as LambdaEventSources,
  aws_s3 as S3,
  aws_sns as SNS,
  aws_sns_subscriptions as SnsSubscriptions,
  aws_sqs as SQS,
  aws_ssm as SSM,
  aws_events as Events,
  aws_events_targets as EventsTargets,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";

export class YacTranscriptionServiceStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    // SNS Topic ARN Imports from Util
    const messageTranscodedSnsTopicArn = Fn.importValue(ExportNames.MessageTranscodedSnsTopicArn);
    const messageTranscribedSnsTopicArn = Fn.importValue(ExportNames.MessageTranscribedSnsTopicArn);

    // S3 Bucket ARN Imports from Util
    const enhancedMessageS3BucketArn = Fn.importValue(ExportNames.EnhancedMessageS3BucketArn);

    // S3 Buckets
    const enhancedMessageS3Bucket = S3.Bucket.fromBucketArn(this, `EnhancedMessageS3Bucket_${id}`, enhancedMessageS3BucketArn);
    const transcriptionS3Bucket = new S3.Bucket(this, `TranscriptionS3Bucket_${id}`, { ...(environment !== Environment.Prod && { removalPolicy: RemovalPolicy.DESTROY }) });

    // SNS Topics
    const messageTranscodedSnsTopic = SNS.Topic.fromTopicArn(this, `MessageTranscodedSnsTopic_${id}`, messageTranscodedSnsTopicArn);
    const transcriptionJobCompletedSnsTopic = new SNS.Topic(this, `TranscriptionJobCompleted_${id}`, { topicName: `TranscriptionJobCompleted_${id}` });
    const transcriptionJobFailedSnsTopic = new SNS.Topic(this, `TranscriptionJobFailed_${id}`, { topicName: `TranscriptionJobFailed_${id}` });

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
      MESSAGE_S3_BUCKET_NAME: enhancedMessageS3Bucket.bucketName,
      TRANSCRIPTION_S3_BUCKET_NAME: transcriptionS3Bucket.bucketName,
      MESSAGE_TRANSCODED_SNS_TOPIC_ARN: messageTranscodedSnsTopicArn,
      MESSAGE_TRANSCRIBED_SNS_TOPIC_ARN: messageTranscribedSnsTopicArn,
      TRANSCRIPTION_JOB_COMPLETED_SNS_TOPIC_ARN: transcriptionJobCompletedSnsTopic.topicArn,
      TRANSCRIPTION_JOB_FAILED_SNS_TOPIC_ARN: transcriptionJobFailedSnsTopic.topicArn,

    };

    // SQS Queues
    const sqsEventHandlerQueue = new SQS.Queue(this, `SqsEventHandlerQueue_${id}`);
    messageTranscodedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    transcriptionJobCompletedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    transcriptionJobFailedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));

    // Lambdas
    new Lambda.Function(this, `SqsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/sqsEvent"),
      handler: "sqsEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, enhancedMessageS3BucketFullAccessPolicyStatement, transcriptionS3BucketFullAccessPolicyStatement, startTranscriptionJobPolicyStatement, messageTranscribedSnsPublishPolicyStatement ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.SqsEventSource(sqsEventHandlerQueue),
      ],
    });

    new Events.Rule(this, `TranscriptionJobCompletedEvent_${id}`, {
      targets: [ new EventsTargets.SnsTopic(transcriptionJobCompletedSnsTopic) ],
      eventPattern: {
        source: [ "aws.transcribe" ],
        detailType: [ "Transcribe Job State Change" ],
        detail: {
          TranscriptionJobName: [ { prefix: `${stackPrefix}_` } ],
          TranscriptionJobStatus: [ "COMPLETED" ],
        },
      },
    });

    new Events.Rule(this, `TranscriptionJobFailedEvent_${id}`, {
      targets: [ new EventsTargets.SnsTopic(transcriptionJobCompletedSnsTopic) ],
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
