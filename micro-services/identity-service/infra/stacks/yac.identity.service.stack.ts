/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as IAM from "@aws-cdk/aws-iam";
import * as SSM from "@aws-cdk/aws-ssm";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import {
  Environment,
  generateExportNames,
  LogLevel,
  RouteProps,
} from "@yac/core";
import { IYacHttpServiceProps, YacHttpServiceStack } from "@yac/core/infra/stacks/yac.http.service.stack";

export class YacIdentityServiceStack extends YacHttpServiceStack {
  constructor(scope: CDK.Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    const stackPrefix = environment === Environment.Local ? developer : environment;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const ExportNames = generateExportNames(stackPrefix);

    const yacUserPoolClientId = CDK.Fn.importValue(ExportNames.YacUserPoolClientId);
    const yacUserPoolClientSecret = CDK.Fn.importValue(ExportNames.YacUserPoolClientSecret);
    const yacUserPoolClientRedirectUri = CDK.Fn.importValue(ExportNames.YacUserPoolClientRedirectUri);
    const customDomainName = CDK.Fn.importValue(ExportNames.CustomDomainName);
    const secret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/secret`);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      STACK_NAME: id,
      SECRET: secret,
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      USER_POOL_CLIENT_ID: yacUserPoolClientId,
      USER_POOL_CLIENT_SECRET: yacUserPoolClientSecret,
      USER_POOL_CLIENT_REDIRECT_URI: yacUserPoolClientRedirectUri,
      AUTH_SERVICE_DOMAIN: `https://${customDomainName}/auth-service`,
    };

    // Handlers
    const signUpHandler = new Lambda.Function(this, `SignUpHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/signUp"),
      handler: "signUp.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(15),
    });

    const loginHandler = new Lambda.Function(this, `LoginHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/login"),
      handler: "login.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(15),
      memorySize: 512,
    });

    const confirmHandler = new Lambda.Function(this, `ConfirmHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/confirm"),
      handler: "confirm.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy ],
      timeout: CDK.Duration.seconds(15),
    });

    // Lambda Routes
    const routes: RouteProps[] = [
      {
        path: "/sign-up",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: signUpHandler,
      },
      {
        path: "/login",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: loginHandler,
      },
      {
        path: "/confirm",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: confirmHandler,
      },
    ];

    routes.forEach((route) => this.httpApi.addRoute(route));
  }
}
