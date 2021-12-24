/* eslint-disable no-new */
import { Stage } from "aws-cdk-lib";
import { Construct } from "constructs";
import { YacUtilServiceStack } from "@yac/util/infra/stacks/yac.util.service.stack";
import { YacAuthServiceStack } from "@yac/auth/infra/stacks/yac.auth.service.stack";
import { YacStageProps } from "./yac.stage.props";

export class YacStage extends Stage {
  constructor(scope: Construct, id: string, props: YacStageProps) {
    super(scope, id, props);

    const { environment, stackPrefix } = props;

    const utilService = new YacUtilServiceStack(this, `${stackPrefix}-YacUtilService`, {
      environment,
      stackPrefix,
    });

    new YacAuthServiceStack(this, `${stackPrefix}-YacAuthServiceStack`, {
      environment,
      stackPrefix,
      snsTopics: {
        userCreated: utilService.snsTopics.userCreated,
        createUserRequest: utilService.snsTopics.createUserRequest,
      },
      domainName: utilService.domainName,
    });
  }
}
