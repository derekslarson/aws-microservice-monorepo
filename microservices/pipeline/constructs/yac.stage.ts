/* eslint-disable no-new */
import { Stage } from "aws-cdk-lib";
import { Construct } from "constructs";
import { YacUtilServiceStack } from "@yac/util/infra/stacks/yac.util.service.stack";
import { YacAuthServiceStack } from "@yac/auth/infra/stacks/yac.auth.service.stack";
import { YacCoreServiceStack } from "@yac/core/infra/stacks/yac.core.service.stack";
import { YacStageProps } from "./yac.stage.props";
import { YacNotificationServiceStack } from "../../notification/infra/stacks/yac.notification.service.stack";

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
  }
}
