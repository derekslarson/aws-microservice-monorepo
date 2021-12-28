/* eslint-disable no-new */
import {
  Duration,
  Stack,
  StackProps,
  aws_iam as IAM,
  aws_lambda as Lambda,
  aws_s3 as S3,
  aws_s3_notifications as S3Notifications,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";

export class YacTranscodingServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: YacTranscodingServiceStackProps) {
    super(scope, id, { stackName: id, ...props });

    const { environment, s3BucketArns, snsTopicArns, audoAi } = props;

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    // S3 Buckets
    const rawMessageS3Bucket = S3.Bucket.fromBucketArn(this, `RawMessageS3Bucket_${id}`, s3BucketArns.rawMessage);
    const enhancedMessageS3Bucket = S3.Bucket.fromBucketArn(this, `EnhancedMessageS3Bucket_${id}`, s3BucketArns.enhancedMessage);

    const rawMessageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ s3BucketArns.rawMessage, `${s3BucketArns.rawMessage}/*` ],
    });

    const enhancedMessageS3BucketFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "s3:*" ],
      resources: [ s3BucketArns.enhancedMessage, `${s3BucketArns.enhancedMessage}/*` ],
    });

    const messageTranscodedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.messageTranscoded ],
    });

    // const mockHttpIntegrationDomain = `https://${developer}.yacchat.com/transcoding-testing`;

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      AUDO_AI_API_DOMAIN: "https://api.audo.ai",
      AUDO_AI_API_KEY: audoAi.apiKey,
      RAW_MESSAGE_S3_BUCKET_NAME: rawMessageS3Bucket.bucketName,
      ENHANCED_MESSAGE_S3_BUCKET_NAME: enhancedMessageS3Bucket.bucketName,
      MESSAGE_TRANSCODED_SNS_TOPIC_ARN: snsTopicArns.messageTranscoded,

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

    rawMessageS3Bucket.addObjectCreatedNotification(new S3Notifications.LambdaDestination(s3EventHandler));
    enhancedMessageS3Bucket.addObjectCreatedNotification(new S3Notifications.LambdaDestination(s3EventHandler));
  }
}

export interface YacTranscodingServiceStackProps extends StackProps {
  environment: string;
  audoAi: {
    apiKey: string;
  }
  s3BucketArns: {
    rawMessage: string;
    enhancedMessage: string;
  };
  snsTopicArns: {
    messageTranscoded: string;
  }
}
