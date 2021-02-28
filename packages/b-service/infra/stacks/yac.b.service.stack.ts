import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as IAM from "@aws-cdk/aws-iam";
import * as SNS from "@aws-cdk/aws-sns";

import { LogLevel } from "../../../core-service/src/enums/logLevel.enum";
import { Environment } from "../../../core-service/src/enums/environment.enum";
import { ExportNames } from "../../../core-service/src/enums/exportNames.enum";

export class YacBServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `${id}DependencyLayer`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    const messageCreatedTopicArn = CDK.Fn.importValue(ExportNames.MessageCreatedTopicArn);
    const messageCreatedTopic = SNS.Topic.fromTopicArn(this, "MessageCreatedTopicArn", messageCreatedTopicArn);

    // Policies

    const basePolicy: IAM.PolicyStatement[] = [];

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
    };

    // Handlers

    // eslint-disable-next-line no-new
    new Lambda.Function(this, "ConsumeSnsHandler", {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/consumeSns"),
      handler: "consumeSns.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(10),
      events: [
        new LambdaEventSources.SnsEventSource(messageCreatedTopic, {}),
      ],
    });
  }
}
