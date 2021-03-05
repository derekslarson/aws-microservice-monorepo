/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as IAM from "@aws-cdk/aws-iam";
import * as Cognito from "@aws-cdk/aws-cognito";
import * as SSM from "@aws-cdk/aws-ssm";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import {
  Environment,
  HttpApi,
  LogLevel,
  signUpMethod,
  signUpPath,
  loginMethod,
  loginPath,
  confirmPath,
  confirmMethod,
} from "@yac/core";
import { createClientMethod, createClientPath } from "@yac/core/src/api-contracts/createClient.post";

export class YacAuthServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const secret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/secret`);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `${id}_DependencyLayer`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    const userPool = new Cognito.UserPool(this, `${id}_UserPool`, {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { email: true },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
      customAttributes: { authChallenge: new Cognito.StringAttribute({ mutable: true }) },
    });

    const userPoolDomain = new Cognito.UserPoolDomain(this, `${id}_UserPoolDomain`, {
      userPool,
      cognitoDomain: { domainPrefix: "yac-auth-service" },
    });

    new Cognito.UserPoolResourceServer(this, `${id}_ResourceServer`, {
      userPool,
      identifier: "yac",
      scopes: [
        { scopeName: "message.read", scopeDescription: "Read messages" },
        { scopeName: "message.write", scopeDescription: "Write messages" },
        { scopeName: "message.delete", scopeDescription: "Delete messages" },
      ],
    });

    // Table Names
    const clientsTableName = `${id}_clients`;

    // Tables
    const clientsTable = new DynamoDB.Table(this, `${id}_ClientsTable`, {
      tableName: clientsTableName,
      removalPolicy: CDK.RemovalPolicy.DESTROY,
      partitionKey: {
        name: "id",
        type: DynamoDB.AttributeType.STRING,
      },
    });

    // APIs
    const httpApi = new HttpApi(this, `${id}_Api`);

    // Policies
    const userPoolPolicyStatement = new IAM.PolicyStatement({
      actions: [ "cognito-idp:*" ],
      resources: [ userPool.userPoolArn ],
    });

    const sendEmailPolicyStatement = new IAM.PolicyStatement({
      actions: [ "ses:SendEmail", "ses:SendRawEmail" ],
      resources: [ "*" ],
    });

    const clientsTablePolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ clientsTable.tableArn ],
    });

    const basePolicy: IAM.PolicyStatement[] = [];

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      SECRET: secret,
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      API_DOMAIN: `https://${httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_DOMAIN: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      MAIL_SENDER: "derek@yac.com",
      CLIENTS_TABLE_NAME: clientsTableName,
    };

    // Handlers
    const signUpHandler = new Lambda.Function(this, `${id}_SignUpHandler`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/signUp"),
      handler: "signUp.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, sendEmailPolicyStatement, clientsTablePolicyStatement ],
      timeout: CDK.Duration.seconds(7),
    });

    const loginHandler = new Lambda.Function(this, `${id}_LoginHandler`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/login"),
      handler: "login.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, sendEmailPolicyStatement ],
      timeout: CDK.Duration.seconds(7),
    });

    const confirmHandler = new Lambda.Function(this, `${id}_ConfirmHandler`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/confirm"),
      handler: "confirm.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, clientsTablePolicyStatement ],
      timeout: CDK.Duration.seconds(7),
    });

    const createClientHandler = new Lambda.Function(this, `${id}_CreateClientHandler`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createClient"),
      handler: "createClient.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, clientsTablePolicyStatement ],
      timeout: CDK.Duration.seconds(7),
    });

    const preSignUpHandler = new Lambda.Function(this, `${id}_PreSignUpHandler`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/preSignUp"),
      handler: "preSignUp.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(7),
    });

    const defineAuthChallengeHandler = new Lambda.Function(this, `${id}_DefineAuthChallengeHandler`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/defineAuthChallenge"),
      handler: "defineAuthChallenge.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(7),
    });

    const createAuthChallengeHandler = new Lambda.Function(this, `${id}_CreateAuthChallengeHandler`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createAuthChallenge"),
      handler: "createAuthChallenge.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(7),
    });

    const verifyAuthChallengeResponseHandler = new Lambda.Function(this, `${id}_VerifyAuthChallengeResponseHandler`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/verifyAuthChallengeResponse"),
      handler: "verifyAuthChallengeResponse.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(7),
    });

    userPool.addTrigger(Cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpHandler);
    userPool.addTrigger(Cognito.UserPoolOperation.DEFINE_AUTH_CHALLENGE, defineAuthChallengeHandler);
    userPool.addTrigger(Cognito.UserPoolOperation.CREATE_AUTH_CHALLENGE, createAuthChallengeHandler);
    userPool.addTrigger(Cognito.UserPoolOperation.VERIFY_AUTH_CHALLENGE_RESPONSE, verifyAuthChallengeResponseHandler);

    // Routes
    httpApi.addRoute({
      path: signUpPath,
      method: signUpMethod,
      handler: signUpHandler,
    });

    httpApi.addRoute({
      path: loginPath,
      method: loginMethod,
      handler: loginHandler,
    });

    httpApi.addRoute({
      path: confirmPath,
      method: confirmMethod,
      handler: confirmHandler,
    });

    httpApi.addRoute({
      path: createClientPath,
      method: createClientMethod,
      handler: createClientHandler,
    });
  }
}
