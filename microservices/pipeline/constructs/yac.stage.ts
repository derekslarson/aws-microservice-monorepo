/* eslint-disable no-new */
import { Stage } from "aws-cdk-lib";
import { Construct } from "constructs";
// import { YacAuthServiceStack } from "../../microservices/auth/infra/stacks/yac.auth.service.stack";
import { YacUtilServiceStack } from "@yac/util/infra/stacks/yac.util.service.stack";
import { YacStageProps } from "./yac.stage.props";

export class YacStage extends Stage {
  constructor(scope: Construct, id: string, props: YacStageProps) {
    super(scope, id, props);

    const { environment, stackPrefix } = props;

    new YacUtilServiceStack(this, `${stackPrefix}-YacUtilService`, {
      environment,
      stackPrefix,
    });

    // new YacAuthServiceStack(this, `${stackPrefix}-YacAuthServiceStack`, {
    //   environment,
    //   stackPrefix,
    //   snsTopics: {
    //     userCreated: utilService.snsTopics.userCreated,
    //     createUserRequest: utilService.snsTopics.createUserRequest,
    //   },
    //   domainName: utilService.domainName,
    //   hostedZone: {
    //     name: hostedZoneName,
    //     id: hostedZoneId,
    //     certificateArn,
    //   },
    //   googleClient: {
    //     id: SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/google-client-id`),
    //     secret: SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/google-client-secret`),
    //   },
    //   slackClient: {
    //     id: SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/slack-client-id`),
    //     secret: SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/slack-client-secret`),
    //   },
    // });
  }
}
