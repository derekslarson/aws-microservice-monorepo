/* eslint-disable no-new */
import {
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
  aws_events as Events,
  aws_events_targets as EventsTargets,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";

export class YacTranscriptionServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: YacTranscriptionServiceStackProps) {
    super(scope, id, { stackName: id, ...props });

    const { environment, s3BucketArns, snsTopicArns } = props;

    // S3 Buckets
    const transcriptionS3Bucket = new S3.Bucket(this, `TranscriptionS3Bucket_${id}`, { ...(environment !== Environment.Prod && { removalPolicy: RemovalPolicy.DESTROY }) });
    const enhancedMessageS3Bucket = S3.Bucket.fromBucketArn(this, `EnhancedMessageS3Bucket_${id}`, s3BucketArns.enhancedMessage);

    // SNS Topics
    const transcriptionJobCompletedSnsTopic = new SNS.Topic(this, `TranscriptionJobCompleted_${id}`, { topicName: `TranscriptionJobCompleted_${id}` });
    const transcriptionJobFailedSnsTopic = new SNS.Topic(this, `TranscriptionJobFailed_${id}`, { topicName: `TranscriptionJobFailed_${id}` });
    const messageTranscodedSnsTopic = SNS.Topic.fromTopicArn(this, `MessageTranscodedSnsTopic_${id}`, snsTopicArns.messageTranscoded);
    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const enhancedMessageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ s3BucketArns.enhancedMessage, `${s3BucketArns.enhancedMessage}/*` ],
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
      resources: [ snsTopicArns.messageTranscribed ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      MESSAGE_S3_BUCKET_NAME: enhancedMessageS3Bucket.bucketName,
      TRANSCRIPTION_S3_BUCKET_NAME: transcriptionS3Bucket.bucketName,
      MESSAGE_TRANSCODED_SNS_TOPIC_ARN: snsTopicArns.messageTranscoded,
      MESSAGE_TRANSCRIBED_SNS_TOPIC_ARN: snsTopicArns.messageTranscribed,
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
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/sqsEvent`),
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
          TranscriptionJobName: [ { prefix: `${environment}_` } ],
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
          TranscriptionJobName: [ { prefix: `${environment}_` } ],
          TranscriptionJobStatus: [ "FAILED" ],
        },
      },
    });
  }
}

export interface YacTranscriptionServiceStackProps extends StackProps {
  environment: string;
  s3BucketArns: {
    rawMessage: string;
    enhancedMessage: string;
  };
  snsTopicArns: {
    messageTranscoded: string;
    messageTranscribed: string;
  }
}
