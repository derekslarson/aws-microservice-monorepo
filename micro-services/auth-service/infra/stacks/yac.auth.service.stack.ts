/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as IAM from "@aws-cdk/aws-iam";
import * as Cognito from "@aws-cdk/aws-cognito";
import * as SSM from "@aws-cdk/aws-ssm";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as S3 from "@aws-cdk/aws-s3";
import * as CloudFront from "@aws-cdk/aws-cloudfront";
import * as CFOrigins from "@aws-cdk/aws-cloudfront-origins";

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
  createClientMethod,
  createClientPath,
  deleteClientPath,
  deleteClientMethod,
} from "@yac/core";

export type IYacAuthServiceStackProps = CDK.StackProps;

export class YacAuthServiceStack extends CDK.Stack {
  public readonly websiteBucket: S3.IBucket;

  constructor(scope: CDK.Construct, id: string, props?: IYacAuthServiceStackProps) {
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

    const userPool = new Cognito.UserPool(this, `UserPool_${id}`, {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { email: true },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
      customAttributes: { authChallenge: new Cognito.StringAttribute({ mutable: true }) },
    });

    const userPoolDomain = new Cognito.UserPoolDomain(this, `UserPoolDomain_${id}`, {
      userPool,
      cognitoDomain: { domainPrefix: "yac-auth-service" },
    });

    new Cognito.UserPoolResourceServer(this, `ResourceServer_${id}`, {
      userPool,
      identifier: "yac",
      scopes: [
        { scopeName: "message.read", scopeDescription: "Read messages" },
        { scopeName: "message.write", scopeDescription: "Write messages" },
        { scopeName: "message.delete", scopeDescription: "Delete messages" },
      ],
    });

    // Table Names
    const clientsTableName = `clients_${id}`;

    // Tables
    const clientsTable = new DynamoDB.Table(this, `ClientsTable_${id}`, {
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

    // Declare bucket for AUTH_UI page
    const envString = environment === Environment.Local ? `${this.node.tryGetContext("developer") as string}-stage` : environment;
    const websiteBucket = new S3.Bucket(this, `${envString}-idYacCom`, {
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
    });

    const websiteDistribution = new CloudFront.Distribution(this, `${envString}-idYacComDistribution`, { defaultBehavior: { origin: new CFOrigins.S3Origin(websiteBucket) } });

    this.websiteBucket = websiteBucket;

    new CDK.CfnOutput(this, "idYacCom", { value: websiteDistribution.distributionDomainName });

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
      AUTH_UI: websiteDistribution.distributionDomainName,
    };

    // Handlers
    const signUpHandler = new Lambda.Function(this, `SignUpHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/signUp"),
      handler: "signUp.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, sendEmailPolicyStatement, clientsTablePolicyStatement ],
      timeout: CDK.Duration.seconds(10),
    });

    const loginHandler = new Lambda.Function(this, `LoginHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/login"),
      handler: "login.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, sendEmailPolicyStatement, clientsTablePolicyStatement ],
      timeout: CDK.Duration.seconds(10),
    });

    const confirmHandler = new Lambda.Function(this, `ConfirmHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/confirm"),
      handler: "confirm.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, clientsTablePolicyStatement ],
      timeout: CDK.Duration.seconds(10),
    });

    const createClientHandler = new Lambda.Function(this, `CreateClientHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createClient"),
      handler: "createClient.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, clientsTablePolicyStatement ],
      timeout: CDK.Duration.seconds(10),
    });

    const deleteClientHandler = new Lambda.Function(this, `DeleteClientHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/deleteClient"),
      handler: "deleteClient.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, clientsTablePolicyStatement ],
      timeout: CDK.Duration.seconds(10),
    });

    const preSignUpHandler = new Lambda.Function(this, `PreSignUpHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/preSignUp"),
      handler: "preSignUp.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(10),
    });

    const defineAuthChallengeHandler = new Lambda.Function(this, `DefineAuthChallengeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/defineAuthChallenge"),
      handler: "defineAuthChallenge.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(10),
    });

    const createAuthChallengeHandler = new Lambda.Function(this, `CreateAuthChallengeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createAuthChallenge"),
      handler: "createAuthChallenge.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(10),
    });

    const verifyAuthChallengeResponseHandler = new Lambda.Function(this, `VerifyAuthChallengeResponseHandler_${id}`, {
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

    httpApi.addRoute({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      path: deleteClientPath,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      method: deleteClientMethod,
      handler: deleteClientHandler,
    });

    new CDK.CfnOutput(this, "AuthServiceBaseUrl", { value: httpApi.apiEndpoint });
  }
}
