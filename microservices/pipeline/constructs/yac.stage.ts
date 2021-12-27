/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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

    const utilService = new YacUtilServiceStack(this, "YacUtilService", {
      stackName: `${environment}-YacUtilService`,
      environment,
    });

    const authService = new YacAuthServiceStack(this, "YacAuthService", {
      stackName: `${environment}-YacAuthService`,
      environment,
      snsTopicArns: utilService.exports.snsTopicArns,
      googleClient: utilService.exports.googleClient,
      slackClient: utilService.exports.slackClient,
      domainNameAttributes: utilService.exports.domainNameAttributes,
      hostedZoneAttributes: utilService.exports.hostedZoneAttributes,
      certificateArn: utilService.exports.certificateArn,
    });

    new YacCoreServiceStack(this, "YacCoreService", {
      stackName: `${environment}-YacCoreService`,
      environment,
      authorizerHandler: authService.authorizerHandler,
      domainName: utilService.domainName,
      snsTopics: utilService.snsTopics,
      s3Buckets: utilService.s3Buckets,
      secrets: utilService.secrets,
    });

    const notificationService = new YacNotificationServiceStack(this, "YacNotificationService", {
      stackName: `${environment}-YacNotificationService`,
      environment,
      authorizerHandler: authService.authorizerHandler,
      domainName: utilService.domainName,
      snsTopics: utilService.snsTopics,
      hostedZone: utilService.hostedZone,
      certificate: utilService.certificate,
      gcmServerKey: utilService.gcmServerKey,
    });

    new YacBillingServiceStack(this, "YacBillingService", {
      stackName: `${environment}-YacBillingService`,
      environment,
      authorizerHandler: authService.authorizerHandler,
      domainName: utilService.domainName,
      snsTopics: utilService.snsTopics,
      stripe: utilService.stripe,
    });

    new YacCalendarServiceStack(this, "YacCalendarService", {
      stackName: `${environment}-YacCalendarService`,
      environment,
      authorizerHandler: authService.authorizerHandler,
      domainName: utilService.domainName,
      googleClient: utilService.googleClient,
    });

    const chunkedUploadService = new YacChunkedUploadServiceStack(this, "YacChunkedUploadService", {
      stackName: `${environment}-YacChunkedUploadService`,
      environment,
      domainName: utilService.domainName,
      secrets: utilService.secrets,
      s3Buckets: utilService.s3Buckets,
    });

    new YacImageGeneratorServiceStack(this, "YacImageGeneratorService", {
      stackName: `${environment}-YacImageGeneratorService`,
      environment,
      domainName: utilService.domainName,
    });

    new YacTranscodingServiceStack(this, "YacTranscodingService", {
      stackName: `${environment}-YacTranscodingService`,
      environment,
      audoAiApiKey: utilService.audoAiApiKey,
      s3Buckets: utilService.s3Buckets,
      snsTopics: utilService.snsTopics,
    });

    new YacTranscriptionServiceStack(this, "YacTranscriptionService", {
      stackName: `${environment}-YacTranscriptionService`,
      environment,
      s3Buckets: utilService.s3Buckets,
      snsTopics: utilService.snsTopics,
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

      new YacChunkedUploadTestingStack(this, "YacChunkedUploadTesting", {
        stackName: `${environment}-YacChunkedUploadTesting`,
        domainName: utilService.domainName,
        vpc: chunkedUploadService.vpc,
        fileSystem: chunkedUploadService.fileSystem,
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
