/* eslint-disable no-new */
import { Stage } from "aws-cdk-lib";
import { Construct } from "constructs";
import { YacUtilServiceStack } from "@yac/util/infra/stacks/yac.util.service.stack";
import { YacAuthServiceStack } from "@yac/auth/infra/stacks/yac.auth.service.stack";
import { YacCoreServiceStack } from "@yac/core/infra/stacks/yac.core.service.stack";
import { YacStageProps } from "./yac.stage.props";
import { YacNotificationServiceStack } from "../../notification/infra/stacks/yac.notification.service.stack";
import { YacBillingServiceStack } from "../../billing/infra/stacks/yac.billing.service.stack";
import { YacCalendarServiceStack } from "../../calendar/infra/stacks/yac.calendar.service.stack";
import { YacChunkedUploadServiceStack } from "../../chunked-upload/infra/stacks/yac.chunkedUpload.service.stack";
import { YacChunkedUploadTestingStack } from "../../chunked-upload/e2e/test-stack/infra/stacks/yac.chunkedUpload.testing.stack";
import { YacImageGeneratorServiceStack } from "../../image-generator/infra/stacks/yac.image-generator.service.stack";
import { YacTranscodingServiceStack } from "../../transcoding/infra/stacks/yac.transcoding.service.stack";
import { YacTranscriptionServiceStack } from "../../transcription/infra/stacks/yac.transcription.service.stack";

export class YacStage extends Stage {
  constructor(scope: Construct, id: string, props: YacStageProps) {
    super(scope, id, props);

    const { environment, stackPrefix } = props;

    const utilService = new YacUtilServiceStack(this, "YacUtilService", {
      stackName: `${stackPrefix}-YacUtilService`,
      environment,
      stackPrefix,
    });

    const authService = new YacAuthServiceStack(this, "YacAuthService", {
      stackName: `${stackPrefix}-YacAuthService`,
      environment,
      stackPrefix,
      domainName: utilService.domainName,
      snsTopics: utilService.snsTopics,
      googleClient: utilService.googleClient,
      slackClient: utilService.slackClient,
      hostedZone: utilService.hostedZone,
      certificate: utilService.certificate,
    });

    new YacCoreServiceStack(this, "YacCoreService", {
      stackName: `${stackPrefix}-YacCoreService`,
      environment,
      stackPrefix,
      authorizerHandler: authService.authorizerHandler,
      domainName: utilService.domainName,
      snsTopics: utilService.snsTopics,
      s3Buckets: utilService.s3Buckets,
      secrets: utilService.secrets,
    });

    new YacNotificationServiceStack(this, "YacNotificationService", {
      stackName: `${stackPrefix}-YacNotificationService`,
      environment,
      stackPrefix,
      authorizerHandler: authService.authorizerHandler,
      domainName: utilService.domainName,
      snsTopics: utilService.snsTopics,
      hostedZone: utilService.hostedZone,
      certificate: utilService.certificate,
      gcmServerKey: utilService.gcmServerKey,
    });

    new YacBillingServiceStack(this, "YacBillingService", {
      stackName: `${stackPrefix}-YacBillingService`,
      environment,
      stackPrefix,
      authorizerHandler: authService.authorizerHandler,
      domainName: utilService.domainName,
      snsTopics: utilService.snsTopics,
      stripe: utilService.stripe,
    });

    new YacCalendarServiceStack(this, "YacCalendarService", {
      stackName: `${stackPrefix}-YacCalendarService`,
      environment,
      stackPrefix,
      authorizerHandler: authService.authorizerHandler,
      domainName: utilService.domainName,
      googleClient: utilService.googleClient,
    });

    const chunkedUploadService = new YacChunkedUploadServiceStack(this, "YacChunkedUploadService", {
      stackName: `${stackPrefix}-YacChunkedUploadService`,
      environment,
      domainName: utilService.domainName,
      secrets: utilService.secrets,
      s3Buckets: utilService.s3Buckets,
    });

    new YacChunkedUploadTestingStack(this, "YacChunkedUploadTesting", {
      stackName: `${stackPrefix}-YacChunkedUploadTesting`,
      domainName: utilService.domainName,
      vpc: chunkedUploadService.vpc,
      fileSystemId: chunkedUploadService.fileSystem.fileSystemId,
      fileSystemAccessPointId: chunkedUploadService.fileSystemAccessPoint.accessPointId,
      fileSystemSecurityGroupId: chunkedUploadService.fileSystemSecurityGroup.securityGroupId,
    });

    new YacImageGeneratorServiceStack(this, "YacImageGeneratorService", {
      stackName: `${stackPrefix}-YacImageGeneratorService`,
      environment,
      domainName: utilService.domainName,
    });

    new YacTranscodingServiceStack(this, "YacTranscodingService", {
      stackName: `${stackPrefix}-YacTranscodingService`,
      environment,
      audoAiApiKey: utilService.audoAiApiKey,
      s3Buckets: utilService.s3Buckets,
      snsTopics: utilService.snsTopics,
    });

    new YacTranscriptionServiceStack(this, "YacTranscriptionService", {
      stackName: `${stackPrefix}-YacTranscriptionService`,
      environment,
      stackPrefix,
      s3Buckets: utilService.s3Buckets,
      snsTopics: utilService.snsTopics,
    });
  }
}
