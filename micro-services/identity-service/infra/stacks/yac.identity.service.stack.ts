/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as IAM from "@aws-cdk/aws-iam";
import * as SSM from "@aws-cdk/aws-ssm";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import {
  Environment,
  HttpApi,
  LogLevel,
} from "@yac/core";

export class YacIdentityServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const secret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/secret`);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // APIs
    const httpApi = new HttpApi(this, `${id}_Api`);

    // Policies

    const ssmPolicyStatement: IAM.PolicyStatement = new IAM.PolicyStatement({
      actions: [ "ssm:PutParameter", "ssm:GetParameter", "ssm:DeleteParameter" ],
      resources: [ `arn:aws:ssm:${this.region}:${this.account}:parameter/yac/${id}/*` ],
    });

    const basePolicy: IAM.PolicyStatement[] = [];

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      STACK_NAME: id,
      SECRET: secret,
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
    };

    // Handlers
    const registerClientHandler = new Lambda.Function(this, `RegisterClientHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/registerClient"),
      handler: "registerClient.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, ssmPolicyStatement ],
      timeout: CDK.Duration.seconds(7),
    });

    const registerClientCustomResource = new CDK.CustomResource(this, `RegisterClientCustomResource_${id}`, { serviceToken: registerClientHandler.functionArn });

    environmentVariables.CLIENT_ID = registerClientCustomResource.getAttString("clientId");
    environmentVariables.CLIENT_SECRET = registerClientCustomResource.getAttString("clientSecret");

    const signUpHandler = new Lambda.Function(this, `SignUpHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/signUp"),
      handler: "signUp.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(7),
    });

    // const loginHandler = new Lambda.Function(this, `LoginHandler_${id}`, {
    //   runtime: Lambda.Runtime.NODEJS_12_X,
    //   code: Lambda.Code.fromAsset("dist/handlers/login"),
    //   handler: "login.handler",
    //   layers: [ dependencyLayer ],
    //   environment: environmentVariables,
    //   initialPolicy: [ ...basePolicy ],
    //   timeout: CDK.Duration.seconds(7),
    // });

    // const confirmHandler = new Lambda.Function(this, `ConfirmHandler_${id}`, {
    //   runtime: Lambda.Runtime.NODEJS_12_X,
    //   code: Lambda.Code.fromAsset("dist/handlers/confirm"),
    //   handler: "confirm.handler",
    //   layers: [ dependencyLayer ],
    //   environment: environmentVariables,
    //   initialPolicy: [ ...basePolicy ],
    //   timeout: CDK.Duration.seconds(7),
    // });

    // // Routes
    httpApi.addRoute({
      path: "/yac/sign-up",
      method: ApiGatewayV2.HttpMethod.POST,
      handler: signUpHandler,
    });

    // httpApi.addRoute({
    //   path: loginPath,
    //   method: loginMethod,
    //   handler: loginHandler,
    // });

    // httpApi.addRoute({
    //   path: confirmPath,
    //   method: confirmMethod,
    //   handler: confirmHandler,
    // });
  }
}