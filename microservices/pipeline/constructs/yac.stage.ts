/* eslint-disable no-new */
import { Stage } from "aws-cdk-lib";
import { Construct } from "constructs";
import { YacUtilServiceStack } from "@yac/util/infra/stacks/yac.util.service.stack";
import { YacAuthServiceStack } from "@yac/auth/infra/stacks/yac.auth.service.stack";
import { YacCoreServiceStack } from "@yac/core/infra/stacks/yac.core.service.stack";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { YacCoreTestingStack } from "@yac/core/e2e/test-stack/infra/stacks/yac.core.testing.stack";
import { YacNotificationServiceStack } from "@yac/notification/infra/stacks/yac.notification.service.stack";
import { YacBillingServiceStack } from "@yac/billing/infra/stacks/yac.billing.service.stack";
import { YacCalendarServiceStack } from "@yac/calendar/infra/stacks/yac.calendar.service.stack";
import { YacChunkedUploadServiceStack } from "@yac/chunked-upload/infra/stacks/yac.chunkedUpload.service.stack";
import { YacChunkedUploadTestingStack } from "@yac/chunked-upload/e2e/test-stack/infra/stacks/yac.chunkedUpload.testing.stack";
import { YacImageGeneratorServiceStack } from "@yac/image-generator/infra/stacks/yac.image-generator.service.stack";
import { YacTranscodingServiceStack } from "@yac/transcoding/infra/stacks/yac.transcoding.service.stack";
import { YacTranscriptionServiceStack } from "@yac/transcription/infra/stacks/yac.transcription.service.stack";
import { YacNotificationTestingStack } from "@yac/notification/e2e/test-stack/infra/stacks/yac.notification.testing.stack";
import { YacTranscodingTestingStack } from "@yac/transcoding/e2e/test-stack/infra/stacks/yac.transcoding.testing.stack";
import { YacTranscriptionTestingStack } from "@yac/transcription/e2e/test-stack/infra/stacks/yac.transcription.testing.stack";
import { YacStageProps } from "./yac.stage.props";

export class YacStage extends Stage {
  constructor(scope: Construct, id: string, props: YacStageProps) {
    super(scope, id, props);

    const { environment } = props;

    const utilService = new YacUtilServiceStack(this, `${environment}-YacUtilService`, { environment });

    const authService = new YacAuthServiceStack(this, `${environment}-YacAuthService`, {
      environment,
      snsTopicArns: utilService.exports.snsTopicArns,
      googleClient: utilService.exports.googleClient,
      slackClient: utilService.exports.slackClient,
      domainNameAttributes: utilService.exports.domainNameAttributes,
      hostedZoneAttributes: utilService.exports.hostedZoneAttributes,
      certificateArn: utilService.exports.certificateArn,
    });

    new YacCoreServiceStack(this, `${environment}-YacCoreService`, {
      environment,
      authorizerHandlerFunctionArn: authService.exports.functionArns.authorizerHandler,
      domainNameAttributes: utilService.exports.domainNameAttributes,
      snsTopicArns: utilService.exports.snsTopicArns,
      s3BucketArns: utilService.exports.s3BucketArns,
      secretArns: utilService.exports.secretArns,
    });

    const notificationService = new YacNotificationServiceStack(this, `${environment}-YacNotificationService`, {
      environment,
      authorizerHandlerFunctionArn: authService.exports.functionArns.authorizerHandler,
      domainNameAttributes: utilService.exports.domainNameAttributes,
      snsTopicArns: utilService.exports.snsTopicArns,
      hostedZoneAttributes: utilService.exports.hostedZoneAttributes,
      certificateArn: utilService.exports.certificateArn,
      gcmServerKey: utilService.exports.gcmServerKey,
    });

    new YacBillingServiceStack(this, `${environment}-YacBillingService`, {
      environment,
      authorizerHandlerFunctionArn: authService.exports.functionArns.authorizerHandler,
      domainNameAttributes: utilService.exports.domainNameAttributes,
      snsTopicArns: utilService.exports.snsTopicArns,
      stripe: utilService.exports.stripe,
    });

    new YacCalendarServiceStack(this, `${environment}-YacCalendarService`, {
      environment,
      authorizerHandlerFunctionArn: authService.exports.functionArns.authorizerHandler,
      domainNameAttributes: utilService.exports.domainNameAttributes,
      googleClient: utilService.exports.googleClient,
    });

    const chunkedUploadService = new YacChunkedUploadServiceStack(this, `${environment}-YacChunkedUploadService`, {
      environment,
      domainNameAttributes: utilService.exports.domainNameAttributes,
      secretArns: utilService.exports.secretArns,
      s3BucketArns: utilService.exports.s3BucketArns,
    });

    new YacImageGeneratorServiceStack(this, `${environment}-YacImageGeneratorService`, {
      environment,
      domainNameAttributes: utilService.exports.domainNameAttributes,
    });

    new YacTranscodingServiceStack(this, `${environment}-YacTranscodingService`, {
      environment,
      audoAi: utilService.exports.audoAi,
      s3BucketArns: utilService.exports.s3BucketArns,
      snsTopicArns: utilService.exports.snsTopicArns,
    });

    new YacTranscriptionServiceStack(this, `${environment}-YacTranscriptionService`, {
      environment,
      s3BucketArns: utilService.exports.s3BucketArns,
      snsTopicArns: utilService.exports.snsTopicArns,
    });

    if (environment !== Environment.Prod) {
      new YacCoreTestingStack(this, "YacCoreTesting", {
        stackName: `${environment}-YacCoreTesting`,
        environment,
        snsTopics: utilService.snsTopics,
      });

      new YacNotificationTestingStack(this, "YacNotificationTesting", {
        stackName: `${environment}-YacNotificationTesting`,
        environment,
        snsTopics: { pushNotificationFailed: notificationService.pushNotificationFailedSnsTopic },
      });

      new YacChunkedUploadTestingStack(this, `${environment}-YacChunkedUploadTesting`, {
        domainNameAttributes: utilService.exports.domainNameAttributes,
        vpcAttributes: chunkedUploadService.exports.vpcAttributes,
        fileSystemAttributes: chunkedUploadService.exports.fileSystemAttributes,
      });

      new YacTranscodingTestingStack(this, "YacTranscodingTesting", {
        stackName: `${environment}-YacTranscodingTesting`,
        environment,
        domainName: utilService.domainName,
        snsTopics: utilService.snsTopics,
      });

      new YacTranscriptionTestingStack(this, "YacTranscriptionTesting", {
        stackName: `${environment}-YacTranscriptionTesting`,
        environment,
        snsTopics: utilService.snsTopics,
      });
    }
  }
}
