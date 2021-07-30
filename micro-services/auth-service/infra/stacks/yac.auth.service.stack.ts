/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as IAM from "@aws-cdk/aws-iam";
import * as Cognito from "@aws-cdk/aws-cognito";
import * as SSM from "@aws-cdk/aws-ssm";
import * as SNS from "@aws-cdk/aws-sns";
import * as CustomResources from "@aws-cdk/custom-resources";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as S3 from "@aws-cdk/aws-s3";
import * as CloudFront from "@aws-cdk/aws-cloudfront";
import * as CFOrigins from "@aws-cdk/aws-cloudfront-origins";
import * as Route53 from "@aws-cdk/aws-route53";
import * as S3Deployment from "@aws-cdk/aws-s3-deployment";
import {
  Environment,
  HttpApi,
  LogLevel,
  RouteProps,
  generateExportNames,
  ProxyRouteProps,
  AuthServiceLoginPath,
  AuthServiceLoginMethod,
  AuthServiceConfirmPath,
  AuthServiceConfirmMethod,
  AuthServiceCreateClientPath,
  AuthServiceCreateClientMethod,
  AuthServiceDeleteClientPath,
  AuthServiceDeleteClientMethod,
  AuthServiceOauth2AuthorizePath,
  AuthServiceOauth2AuthorizeMethod,
} from "@yac/util";
import { IYacHttpServiceProps, YacHttpServiceStack } from "@yac/util/infra/stacks/yac.http.service.stack";

export type IYacAuthServiceStackProps = IYacHttpServiceProps;

export class YacAuthServiceStack extends YacHttpServiceStack {
  public readonly api: HttpApi;

  constructor(scope: CDK.Construct, id: string, props: IYacAuthServiceStackProps) {
    super(scope, id, { ...props, addAuthorizer: false });

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;
    const ExportNames = generateExportNames(stackPrefix);
    const secret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/secret`);
    const userCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.UserCreatedSnsTopicArn);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Tables
    // const pkceTable = new DynamoDB.Table(this, `PkceTable_${id}`, {
    //   billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
    //   partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
    //   sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
    //   removalPolicy: CDK.RemovalPolicy.DESTROY,
    //   stream: DynamoDB.StreamViewType.NEW_AND_OLD_IMAGES,
    // });

    // id.yac.com Deployment Resources
    const websiteBucket = new S3.Bucket(this, `IdYacComS3Bucket_${id}`, {
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      removalPolicy: CDK.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distributionOriginRequestPolicy = new CloudFront.OriginRequestPolicy(this, `idYacComDistributionOriginRequestPolicy_${id}`, {
      originRequestPolicyName: `idYacComDistributionOriginRequestPolicy_${id}`,
      cookieBehavior: {
        behavior: "whitelist",
        cookies: [ "XSRF-TOKEN" ],
      },
    });

    const websiteDistribution = new CloudFront.Distribution(this, `IdYacComDistribution_${id}`, {
      defaultBehavior: {
        origin: new CFOrigins.S3Origin(websiteBucket),
        originRequestPolicy: { originRequestPolicyId: distributionOriginRequestPolicy.originRequestPolicyId },
      },
      certificate: this.certificate,
      domainNames: [ `${this.recordName}-assets.${this.zoneName}` ],
    });

    const cnameRecord = new Route53.CnameRecord(this, `CnameRecord_${id}`, {
      domainName: websiteDistribution.distributionDomainName,
      zone: this.hostedZone,
      recordName: `${this.recordName}-assets`,
    });

    new S3Deployment.BucketDeployment(this, `IdYacComDeployment_${id}`, {
      sources: [ S3Deployment.Source.asset("ui/build") ],
      destinationBucket: websiteBucket,
    });

    // User Pool Lambdas
    const userPoolLambaEnvVars: Record<string, string> = {
      SECRET: secret,
      ENVIRONMENT: environment,
      STACK_PREFIX: stackPrefix,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Info}`,
    };

    const preSignUpHandler = new Lambda.Function(this, `PreSignUpHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/preSignUp"),
      handler: "preSignUp.handler",
      layers: [ dependencyLayer ],
      environment: userPoolLambaEnvVars,
      timeout: CDK.Duration.seconds(15),
    });

    const defineAuthChallengeHandler = new Lambda.Function(this, `DefineAuthChallengeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/defineAuthChallenge"),
      handler: "defineAuthChallenge.handler",
      layers: [ dependencyLayer ],
      environment: userPoolLambaEnvVars,
      timeout: CDK.Duration.seconds(15),
    });

    const createAuthChallengeHandler = new Lambda.Function(this, `CreateAuthChallengeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createAuthChallenge"),
      handler: "createAuthChallenge.handler",
      layers: [ dependencyLayer ],
      environment: userPoolLambaEnvVars,
      timeout: CDK.Duration.seconds(15),
    });

    const verifyAuthChallengeResponseHandler = new Lambda.Function(this, `VerifyAuthChallengeResponseHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/verifyAuthChallengeResponse"),
      handler: "verifyAuthChallengeResponse.handler",
      layers: [ dependencyLayer ],
      environment: userPoolLambaEnvVars,
      timeout: CDK.Duration.seconds(15),
    });

    // User Pool Related Resouces
    const userPool = new Cognito.UserPool(this, `UserPool_${id}`, {
      selfSignUpEnabled: true,
      autoVerify: { email: true, phone: true },
      signInAliases: { username: true, email: true, phone: true },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
      customAttributes: { authChallenge: new Cognito.StringAttribute({ mutable: true }) },
      lambdaTriggers: {
        preSignUp: preSignUpHandler,
        defineAuthChallenge: defineAuthChallengeHandler,
        createAuthChallenge: createAuthChallengeHandler,
        verifyAuthChallengeResponse: verifyAuthChallengeResponseHandler,
      },
    });

    const userPoolDomain = new Cognito.UserPoolDomain(this, `UserPoolDomain_${id}`, {
      userPool,
      cognitoDomain: { domainPrefix: `${this.recordName}-yac-auth-service` },
    });

    const userPoolDomainUrl = `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`;

    const resourceServerIdentifier = "yac";

    const resourceServerScopes: Cognito.ResourceServerScope[] = [
      { scopeName: "user.read", scopeDescription: "Read users" },
      { scopeName: "user.write", scopeDescription: "Write users" },
      { scopeName: "user.delete", scopeDescription: "Delete users" },
      { scopeName: "message.read", scopeDescription: "Read messages" },
      { scopeName: "message.write", scopeDescription: "Write messages" },
      { scopeName: "message.delete", scopeDescription: "Delete messages" },
      { scopeName: "team.read", scopeDescription: "Read teams" },
      { scopeName: "team.write", scopeDescription: "Write teams" },
      { scopeName: "team.delete", scopeDescription: "Delete teams" },
      { scopeName: "friend.read", scopeDescription: "Read friends" },
      { scopeName: "friend.write", scopeDescription: "Write friends" },
      { scopeName: "friend.delete", scopeDescription: "Delete friends" },
      { scopeName: "group.read", scopeDescription: "Read groups" },
      { scopeName: "group.write", scopeDescription: "Write groups" },
      { scopeName: "group.delete", scopeDescription: "Delete groups" },
      { scopeName: "meeting.read", scopeDescription: "Read meetings" },
      { scopeName: "meeting.write", scopeDescription: "Write meetings" },
      { scopeName: "meeting.delete", scopeDescription: "Delete meetings" },
      { scopeName: "conversation.read", scopeDescription: "Read conversations" },
      { scopeName: "conversation.write", scopeDescription: "Write conversations" },
      { scopeName: "conversation.delete", scopeDescription: "Delete conversations" },
    ];

    new Cognito.UserPoolResourceServer(this, `ResourceServer_${id}`, {
      userPool,
      identifier: resourceServerIdentifier,
      scopes: resourceServerScopes,
    });

    const clientScopes = resourceServerScopes.map((scopeItem) => ({ scopeName: `${resourceServerIdentifier}/${scopeItem.scopeName}` }));

    // Yac User Pool Client
    const yacUserPoolClientRedirectUri = `https://${cnameRecord.domainName}`;

    const yacUserPoolClient = new Cognito.UserPoolClient(this, `YacUserPoolClient_${id}`, {
      userPool,
      generateSecret: true,
      authFlows: { custom: true, userPassword: true },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        callbackUrls: [ yacUserPoolClientRedirectUri ],
        scopes: clientScopes,
      },
    });

    // We need the secret of the YacUserPoolClient in order to pass it down to the env vars, so we are using a custom resource to fetch it
    const describeCognitoUserPoolClient = new CustomResources.AwsCustomResource(this, `DescribeCognitoUserPoolClient_${id}`, {
      resourceType: "Custom::DescribeCognitoUserPoolClient",
      onCreate: {
        region: this.region,
        service: "CognitoIdentityServiceProvider",
        action: "describeUserPoolClient",
        parameters: {
          UserPoolId: userPool.userPoolId,
          ClientId: yacUserPoolClient.userPoolClientId,
        },
        physicalResourceId: CustomResources.PhysicalResourceId.of(yacUserPoolClient.userPoolClientId),
      },
      policy: CustomResources.AwsCustomResourcePolicy.fromSdkCalls({ resources: CustomResources.AwsCustomResourcePolicy.ANY_RESOURCE }),
    });

    const yacUserPoolClientSecret = describeCognitoUserPoolClient.getResponseField("UserPoolClient.ClientSecret");

    // Policies

    // const pkceTableFullAccessPolicyStatement = new IAM.PolicyStatement({
    //   actions: [ "dynamodb:*" ],
    //   resources: [ pkceTable.tableArn, `${pkceTable.tableArn}/*` ],
    // });

    const userPoolPolicyStatement = new IAM.PolicyStatement({
      actions: [ "cognito-idp:*" ],
      resources: [ userPool.userPoolArn ],
    });

    const sendEmailPolicyStatement = new IAM.PolicyStatement({
      actions: [ "ses:SendEmail", "ses:SendRawEmail" ],
      resources: [ "*" ],
    });

    // Because we can't reference a resource for a phone number to allow,
    // we have to allow everything except all valid arns, effectively only allowing phone numbers
    const sendTextPolicyStatement = new IAM.PolicyStatement({
      actions: [ "sns:Publish" ],
      notResources: [ "arn:aws:sns:*:*:*" ],
    });

    const clientsUpdatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ this.clientsUpdatedSnsTopic.topicArn ],
    });

    const adminPolicyStatement = new IAM.PolicyStatement({
      actions: [ "*" ],
      resources: [ "*" ],
    });

    const basePolicy: IAM.PolicyStatement[] = [];

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      SECRET: secret,
      ENVIRONMENT: environment,
      STACK_PREFIX: stackPrefix,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Info}`,
      API_DOMAIN: `https://${this.httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_DOMAIN: userPoolDomainUrl,
      YAC_USER_POOL_CLIENT_ID: yacUserPoolClient.userPoolClientId,
      YAC_USER_POOL_CLIENT_SECRET: yacUserPoolClientSecret,
      MAIL_SENDER: "no-reply@yac.com",
      YAC_AUTH_UI: yacUserPoolClientRedirectUri,
      CLIENTS_UPDATED_SNS_TOPIC_ARN: this.clientsUpdatedSnsTopic.topicArn,
      USER_CREATED_SNS_TOPIC_ARN: userCreatedSnsTopicArn,
      // PKCE_TABLE_NAME: pkceTable.tableName,
    };

    // Handlers
    new Lambda.Function(this, `SetAuthorizerAudiencesHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/setAuthorizerAudiences"),
      handler: "setAuthorizerAudiences.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      timeout: CDK.Duration.seconds(15),
      initialPolicy: [ ...basePolicy, adminPolicyStatement ],
      events: [
        new LambdaEventSources.SnsEventSource(this.clientsUpdatedSnsTopic),
      ],
    });

    new Lambda.Function(this, `UserCreatedHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/userCreated"),
      handler: "userCreated.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserCreatedSnsTopic_${id}`, userCreatedSnsTopicArn)),
      ],
    });

    const loginHandler = new Lambda.Function(this, `LoginHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/login"),
      handler: "login.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, sendEmailPolicyStatement, sendTextPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const confirmHandler = new Lambda.Function(this, `ConfirmHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/confirm"),
      handler: "confirm.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const createClientHandler = new Lambda.Function(this, `CreateClientHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createClient"),
      handler: "createClient.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, clientsUpdatedSnsPublishPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const deleteClientHandler = new Lambda.Function(this, `DeleteClientHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/deleteClient"),
      handler: "deleteClient.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, clientsUpdatedSnsPublishPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const oauth2AuthorizeHandler = new Lambda.Function(this, `Oauth2AuthorizeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/oauth2Authorize"),
      handler: "oauth2Authorize.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const loginRoute: RouteProps<AuthServiceLoginPath, AuthServiceLoginMethod> = {
      path: "/login",
      method: ApiGatewayV2.HttpMethod.POST,
      handler: loginHandler,
    };

    const confirmRoute: RouteProps<AuthServiceConfirmPath, AuthServiceConfirmMethod> = {
      path: "/confirm",
      method: ApiGatewayV2.HttpMethod.POST,
      handler: confirmHandler,
    };

    const createClientRoute: RouteProps<AuthServiceCreateClientPath, AuthServiceCreateClientMethod> = {
      path: "/oauth2/clients",
      method: ApiGatewayV2.HttpMethod.POST,
      handler: createClientHandler,
    };

    const deleteClientRoute: RouteProps<AuthServiceDeleteClientPath, AuthServiceDeleteClientMethod> = {
      path: "/oauth2/clients/{clientId}",
      method: ApiGatewayV2.HttpMethod.DELETE,
      handler: deleteClientHandler,
    };

    const oauth2AuthorizeRoute: RouteProps<AuthServiceOauth2AuthorizePath, AuthServiceOauth2AuthorizeMethod> = {
      path: "/oauth2/authorize",
      method: ApiGatewayV2.HttpMethod.GET,
      handler: oauth2AuthorizeHandler,
    };

    const routes: RouteProps<string, ApiGatewayV2.HttpMethod>[] = [
      loginRoute,
      confirmRoute,
      createClientRoute,
      deleteClientRoute,
      oauth2AuthorizeRoute,
    ];

    // Proxy Routes
    const proxyRoutes: ProxyRouteProps[] = [
      {
        proxyUrl: `${userPoolDomainUrl}/oauth2/token`,
        path: "/oauth2/token",
        method: ApiGatewayV2.HttpMethod.POST,
      },
    ];

    routes.forEach((route) => this.httpApi.addRoute(route));
    proxyRoutes.forEach((route) => this.httpApi.addProxyRoute(route));

    new SSM.StringParameter(this, `UserPoolIdSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-pool-id`,
      stringValue: yacUserPoolClientSecret,
    });

    new SSM.StringParameter(this, `UserPoolDomainUrlSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/user-pool-domain-url`,
      stringValue: userPoolDomainUrl,
    });

    new SSM.StringParameter(this, `YacClientIdSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/yac-client-id`,
      stringValue: yacUserPoolClient.userPoolClientId,
    });

    new SSM.StringParameter(this, `YacClientSecretSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/yac-client-secret`,
      stringValue: yacUserPoolClientSecret,
    });

    new SSM.StringParameter(this, `YacClientRedirectUriSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/yac-client-redirect-uri`,
      stringValue: yacUserPoolClientRedirectUri,
    });

    new CDK.CfnOutput(this, `UserPoolIdExport_${id}`, {
      exportName: ExportNames.UserPoolId,
      value: userPool.userPoolId,
    });

    new CDK.CfnOutput(this, `YacUserPoolClientIdExport_${id}`, {
      exportName: ExportNames.YacUserPoolClientId,
      value: yacUserPoolClient.userPoolClientId,
    });

    new CDK.CfnOutput(this, `YacUserPoolClientSecretExport_${id}`, {
      exportName: ExportNames.YacUserPoolClientSecret,
      value: yacUserPoolClientSecret,
    });

    new CDK.CfnOutput(this, `YacUserPoolClientRedirectUriExport_${id}`, {
      exportName: ExportNames.YacUserPoolClientRedirectUri,
      value: yacUserPoolClientRedirectUri,
    });

    new CDK.CfnOutput(this, `AuthServiceBaseUrlExport_${id}`, { value: this.httpApi.apiURL });
  }
}
