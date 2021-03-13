/* eslint-disable no-new */

import * as CDK from "@aws-cdk/core";
import * as SNS from "@aws-cdk/aws-sns";
import { ExportNames } from "../../src/enums/exportNames.enum";

export class YacCoreServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const messageCreatedSnsTopic = new SNS.Topic(this, `${id}_MessageCreatedSnsTopic`, { topicName: "messageCreatedSnsTopic" });

    new CDK.CfnOutput(this, `${id}_MessageCreatedSnsTopicArnExport`, {
      exportName: ExportNames.MessageCreatedSnsTopicArn,
      value: messageCreatedSnsTopic.topicArn,
    });
  }
}
