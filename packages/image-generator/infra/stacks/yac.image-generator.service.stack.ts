/* eslint-disable no-new */
import {
  Duration,
  aws_dynamodb as DynamoDB,
  aws_iam as IAM,
  aws_lambda as Lambda,
  StackProps,
  Stack,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";
import { HttpApi, RouteProps } from "@yac/util/infra/constructs/http.api";

export class YacImageGeneratorServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: YacImageGeneratorServiceStackProps) {
    super(scope, id, { stackName: id, ...props });

    const { environment, domainNameAttributes } = props;

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    // Database
    const table = new DynamoDB.Table(this, "GeneratedImagesTable", {
      partitionKey: { name: "id", type: DynamoDB.AttributeType.STRING },
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
    });

    const api = new HttpApi(this, `HttpApi_${id}`, {
      serviceName: "image-generator",
      domainName: ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `DomainName_${id}`, domainNameAttributes),
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      // removes 'https://' from the begining of the url
      ORIGIN: api.apiUrl.slice(8),
      STACK_NAME: id,
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      IMAGES_DYNAMO_TABLE_NAME: table.tableName,
      DYNAMO_REGION: table.env.region,
      YAC_API_URL: "https://api-v3.yacchat.com/api",
    };

    // Handlers
    const mediaRetrieveHandler = new Lambda.Function(this, `MediaRetrieve_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/mediaRetrieve`),
      handler: "mediaRetrieve.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy ],
      timeout: Duration.seconds(15),
    });

    const mediaPushTaskHandler = new Lambda.Function(this, `MediaPush_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/mediaPush`),
      handler: "mediaPush.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy ],
      timeout: Duration.seconds(15),
    });

    const callbackHandler = new Lambda.Function(this, `Callback_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/callback`),
      handler: "callback.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy ],
      timeout: Duration.seconds(15),
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

    routes.forEach((route) => api.addRoute(route));
  }
}

export interface YacImageGeneratorServiceStackProps extends StackProps {
  environment: string;
  domainNameAttributes: ApiGatewayV2.DomainNameAttributes;
}
