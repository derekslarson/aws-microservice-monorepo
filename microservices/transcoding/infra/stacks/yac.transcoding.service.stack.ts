/* eslint-disable no-new */
import {
  Duration,
  Stack,
  StackProps,
  aws_iam as IAM,
  aws_lambda as Lambda,
  aws_s3 as S3,
  aws_s3_notifications as S3Notifications,
  aws_sns as SNS,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";

export class YacTranscodingServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: YacTranscodingServiceStackProps) {
    super(scope, id, props);

    const { environment, s3Buckets, snsTopics, audoAiApiKey } = props;

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const rawMessageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ s3Buckets.rawMessage.bucketArn, `${s3Buckets.rawMessage.bucketArn}/*` ],
    });

    const enhancedMessageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ s3Buckets.enhancedMessage.bucketArn, `${s3Buckets.enhancedMessage.bucketArn}/*` ],
    });

    const messageTranscodedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopics.messageTranscoded.topicArn ],
    });

    // const mockHttpIntegrationDomain = `https://${developer}.yacchat.com/transcoding-testing`;

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      AUDO_AI_API_DOMAIN: "https://api.audo.ai",
      AUDO_AI_API_KEY: audoAiApiKey,
      RAW_MESSAGE_S3_BUCKET_NAME: s3Buckets.rawMessage.bucketName,
      ENHANCED_MESSAGE_S3_BUCKET_NAME: s3Buckets.enhancedMessage.bucketName,
      MESSAGE_TRANSCODED_SNS_TOPIC_ARN: snsTopics.messageTranscoded.topicArn,

    };

    // Lambdas
    const s3EventHandler = new Lambda.Function(this, `S3EventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/s3Event`),
      handler: "s3Event.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, rawMessageS3BucketFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, messageTranscodedSnsPublishPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    s3Buckets.rawMessage.addObjectCreatedNotification(new S3Notifications.LambdaDestination(s3EventHandler));
    s3Buckets.enhancedMessage.addObjectCreatedNotification(new S3Notifications.LambdaDestination(s3EventHandler));
  }
}

export interface YacTranscodingServiceStackProps extends StackProps {
  environment: Environment;
  audoAiApiKey: string;
  s3Buckets: {
    rawMessage: S3.IBucket;
    enhancedMessage: S3.IBucket;
  };
  snsTopics: {
    messageTranscoded: SNS.ITopic
  }
}
