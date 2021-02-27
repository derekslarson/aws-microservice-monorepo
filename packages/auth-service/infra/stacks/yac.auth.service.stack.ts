import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as IAM from "@aws-cdk/aws-iam";
import * as Cognito from "@aws-cdk/aws-cognito";
import * as SSM from "@aws-cdk/aws-ssm";

import { LogLevel } from "../../src/enums/logLevel.enum";
import { Environment } from "../../src/enums/environment.enum";
import { HttpApi } from "../constructs/http.api";
import { UserPool } from "../constructs/user.pool";

export class YacAuthServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const secret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/secret`);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `${id}DependencyLayer`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    const userPool = new UserPool(this, "UserPool", {
      resourceServerIdentifier: "yac",
      scopes: [
        { scopeName: "message.read", scopeDescription: "Read messages" },
        { scopeName: "message.write", scopeDescription: "Write messages" },
        { scopeName: "message.delete", scopeDescription: "Delete messages" },
      ],
    });

    // APIs
    const httpApi = new HttpApi(this, `${id}Api`);

    // Policies
    const userPoolPolicyStatement = new IAM.PolicyStatement({
      actions: [ "cognito-idp:*" ],
      resources: [ userPool.userPoolArn ],
    });

    const sendEmailPolicyStatement = new IAM.PolicyStatement({
      actions: [ "ses:SendEmail", "ses:SendRawEmail" ],
      resources: [ "*" ],
    });

    const basePolicy: IAM.PolicyStatement[] = [];

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      SECRET: secret,
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      API_DOMAIN: `https://${httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_CLIENT_ID: userPool.userPoolClientId,
      USER_POOL_CLIENT_SECRET: userPool.userPoolClientSecret,
      USER_POOL_DOMAIN: `https://${userPool.userPoolDomainName}.auth.${this.region}.amazoncognito.com`,
      MAIL_SENDER: "derek@yac.com",
    };

    // Handlers
    const signUpHandler = new Lambda.Function(this, "SignUpHandler", {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/signUp"),
      handler: "signUp.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, sendEmailPolicyStatement ],
      timeout: CDK.Duration.seconds(10),
    });

    const loginHandler = new Lambda.Function(this, "LoginHandler", {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/login"),
      handler: "login.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, sendEmailPolicyStatement ],
      timeout: CDK.Duration.seconds(10),
    });

    const confirmHandler = new Lambda.Function(this, "ConfirmHandler", {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/confirm"),
      handler: "confirm.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement ],
      timeout: CDK.Duration.seconds(10),
    });

    const preSignUpHandler = new Lambda.Function(this, "PreSignUpHandler", {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/preSignUp"),
      handler: "preSignUp.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(10),
    });

    const defineAuthChallengeHandler = new Lambda.Function(this, "DefineAuthChallengeHandler", {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/defineAuthChallenge"),
      handler: "defineAuthChallenge.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(10),
    });

    const createAuthChallengeHandler = new Lambda.Function(this, "CreateAuthChallengeHandler", {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createAuthChallenge"),
      handler: "createAuthChallenge.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(10),
    });

    const verifyAuthChallengeResponseHandler = new Lambda.Function(this, "VerifyAuthChallengeResponseHandler", {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/verifyAuthChallengeResponse"),
      handler: "verifyAuthChallengeResponse.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(10),
    });

    userPool.addTrigger(Cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpHandler);
    userPool.addTrigger(Cognito.UserPoolOperation.DEFINE_AUTH_CHALLENGE, defineAuthChallengeHandler);
    userPool.addTrigger(Cognito.UserPoolOperation.CREATE_AUTH_CHALLENGE, createAuthChallengeHandler);
    userPool.addTrigger(Cognito.UserPoolOperation.VERIFY_AUTH_CHALLENGE_RESPONSE, verifyAuthChallengeResponseHandler);

    // Routes
    httpApi.addRoute({
      path: "/sign-up",
      method: ApiGatewayV2.HttpMethod.POST,
      handler: signUpHandler,
    });

    httpApi.addRoute({
      path: "/login",
      method: ApiGatewayV2.HttpMethod.POST,
      handler: loginHandler,
    });

    httpApi.addRoute({
      path: "/confirm",
      method: ApiGatewayV2.HttpMethod.GET,
      handler: confirmHandler,
    });
  }
}
