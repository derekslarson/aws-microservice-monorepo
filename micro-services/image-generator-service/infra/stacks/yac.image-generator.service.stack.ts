/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import {
  Environment,
  LogLevel,
  RouteProps,
} from "@yac/core";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/core/infra/stacks/yac.http.service.stack";

export class YacImageGeneratorStack extends YacHttpServiceStack {
  constructor(scope: CDK.Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // APIs
    const { httpApi } = this;

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    // Database
    const table = new DynamoDB.Table(this, "GeneratedImagesTable", {
      partitionKey: { name: "id", type: DynamoDB.AttributeType.STRING },
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      ORIGIN: this.origin,
      STACK_NAME: id,
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      IMAGES_DYNAMO_TABLE_NAME: table.tableName,
      DYNAMO_REGION: table.env.region,
      YAC_API_URL: "https://api-v3.yacchat.com/api",
    };

    // Handlers
    const mediaRetrieveHandler = new Lambda.Function(this, `MediaRetrieve_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/mediaRetrieve"),
      handler: "mediaRetrieve.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(15),
    });

    const mediaPushTaskHandler = new Lambda.Function(this, `MediaPush_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/mediaPush"),
      handler: "mediaPush.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(15),
    });

    const callbackHandler = new Lambda.Function(this, `Callback_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/callback"),
      handler: "callback.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(15),
    });

    // permissions for the handler
    table.grantReadData(mediaRetrieveHandler);
    table.grantWriteData(callbackHandler);
    table.grantReadWriteData(mediaPushTaskHandler);

    // Lambda Routes
    const routes: RouteProps[] = [
      {
        path: "/{folder}/{messageId}/thumbnail.gif",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: mediaRetrieveHandler,
      }, {
        path: "/{folder}/{messageId}/thumbnail",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: mediaPushTaskHandler,
      },
      {
        path: "/bannerbear/callback",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: callbackHandler,
      },
    ];

    routes.forEach((route) => httpApi.addRoute(route));
  }
}
