import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as IAM from "@aws-cdk/aws-iam";

import { LogLevel } from "../../../core-service/src/enums/logLevel.enum";
import { Environment } from "../../../core-service/src/enums/environment.enum";
import { HttpApi } from "../../../core-service/infra/constructs/http.api";
import { ExportNames } from "../../../core-service/src/enums/exportNames.enum";
import { triggerSnsMethod, triggerSnsPath } from "../../../core-service/src/api-contracts/triggerSns.post";

export class YacAServiceStack extends CDK.Stack {
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

    // APIs
    const httpApi = new HttpApi(this, `${id}Api`);

    // Policies
    const mesageCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ messageCreatedTopicArn ],
    });

    const basePolicy: IAM.PolicyStatement[] = [];

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      MESSAGE_CREATED_TOPIC_ARN: messageCreatedTopicArn,
    };

    // Handlers
    const triggerSnsHandler = new Lambda.Function(this, "TriggerSnsHandler", {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/triggerSns"),
      handler: "triggerSns.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, mesageCreatedSnsPublishPolicyStatement ],
      timeout: CDK.Duration.seconds(10),
    });

    httpApi.addRoute({
      path: triggerSnsPath,
      method: triggerSnsMethod,
      handler: triggerSnsHandler,
    });
  }
}
