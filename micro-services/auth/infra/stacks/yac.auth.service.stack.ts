/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as IAM from "@aws-cdk/aws-iam";
import * as SSM from "@aws-cdk/aws-ssm";
import * as SecretsManager from "@aws-cdk/aws-secretsmanager";
import * as SNS from "@aws-cdk/aws-sns";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as S3 from "@aws-cdk/aws-s3";
import * as CloudFront from "@aws-cdk/aws-cloudfront";
import * as CFOrigins from "@aws-cdk/aws-cloudfront-origins";
import * as Route53 from "@aws-cdk/aws-route53";
import * as S3Deployment from "@aws-cdk/aws-s3-deployment";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
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
  AuthServiceOauth2AuthorizePath,
  AuthServiceOauth2AuthorizeMethod,
} from "@yac/util";
import { IYacHttpServiceProps, YacHttpServiceStack } from "@yac/util/infra/stacks/yac.http.service.stack";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

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

    // Manually Set SSM Parameters for the external provider app clients
    // const googleClientId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/google-client-id`);
    // const googleClientSecret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/google-client-secret`);
    // const slackClientId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/slack-client-id`);
    // const slackClientSecret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/slack-client-secret`);

    const userCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.UserCreatedSnsTopicArn);
    const externalProviderUserSignedUpSnsTopicArn = CDK.Fn.importValue(ExportNames.ExternalProviderUserSignedUpSnsTopicArn);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Tables
    const authTable = new DynamoDB.Table(this, `AuthTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
    });

    authTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.One,
      partitionKey: { name: "gsi1pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: DynamoDB.AttributeType.STRING },
    });

    authTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.Two,
      partitionKey: { name: "gsi2pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi2sk", type: DynamoDB.AttributeType.STRING },
    });

    const authSecret = new SecretsManager.Secret(this, `AuthSecret_${id}`);

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

    const authUiCnameRecord = new Route53.CnameRecord(this, `CnameRecord_${id}`, {
      domainName: websiteDistribution.distributionDomainName,
      zone: this.hostedZone,
      recordName: `${this.recordName}-assets`,
    });

    new S3Deployment.BucketDeployment(this, `IdYacComDeployment_${id}`, {
      sources: [ S3Deployment.Source.asset("ui/build") ],
      destinationBucket: websiteBucket,
    });

    // User Pool Lambda Policies

    const authTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ authTable.tableArn, `${authTable.tableArn}/*` ],
    });

    // const externalProviderUserSignedUpSnsPublishPolicyStatement = new IAM.PolicyStatement({
    //   actions: [ "SNS:Publish" ],
    //   resources: [ externalProviderUserSignedUpSnsTopicArn ],
    // });

    // Policies
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

    const getAuthSecretPolicyStatement = new IAM.PolicyStatement({
      actions: [ "secretsmanager:GetSecretValue" ],
      resources: [ authSecret.secretArn ],
    });

    const basePolicy: IAM.PolicyStatement[] = [];

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      JWKS_URI: `https://cognito-idp.${this.region}.amazonaws.com/test/.well-known/jwks.json`,
      AUTH_SECRET_ID: authSecret.secretArn,
      ENVIRONMENT: environment,
      STACK_PREFIX: stackPrefix,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Info}`,
      API_DOMAIN: `https://${this.httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`,
      API_URL: this.httpApi.apiURL,
      MAIL_SENDER: "no-reply@yac.com",
      YAC_AUTH_UI: `https://${authUiCnameRecord.domainName}`,
      USER_CREATED_SNS_TOPIC_ARN: userCreatedSnsTopicArn,
      EXTERNAL_PROVIDER_USER_SIGNED_UP_SNS_TOPIC_ARN: externalProviderUserSignedUpSnsTopicArn,
      AUTH_TABLE_NAME: authTable.tableName,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      GSI_TWO_INDEX_NAME: GlobalSecondaryIndex.Two,
    };

    // Handlers
    new Lambda.Function(this, `SnsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/snsEvent"),
      handler: "snsEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, getAuthSecretPolicyStatement, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserCreatedSnsTopic_${id}`, userCreatedSnsTopicArn)),
      ],
    });

    const authorizerHandler = new Lambda.Function(this, `AuthorizerHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/authorizer"),
      handler: "authorizer.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const loginHandler = new Lambda.Function(this, `LoginHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/login"),
      handler: "login.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, sendEmailPolicyStatement, sendTextPolicyStatement, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const confirmHandler = new Lambda.Function(this, `ConfirmHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/confirm"),
      handler: "confirm.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, getAuthSecretPolicyStatement, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const createClientHandler = new Lambda.Function(this, `CreateClientHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createClient"),
      handler: "createClient.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const oauth2AuthorizeHandler = new Lambda.Function(this, `Oauth2AuthorizeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/oauth2Authorize"),
      handler: "oauth2Authorize.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const oauth2TokenHandler = new Lambda.Function(this, `Oauth2TokenHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/oauth2Token"),
      handler: "oauth2Token.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const oauth2RevokeHandler = new Lambda.Function(this, `Oauth2RevokeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/oauth2Revoke"),
      handler: "oauth2Revoke.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
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

    const oauth2AuthorizeRoute: RouteProps<AuthServiceOauth2AuthorizePath, AuthServiceOauth2AuthorizeMethod> = {
      path: "/oauth2/authorize",
      method: ApiGatewayV2.HttpMethod.GET,
      handler: oauth2AuthorizeHandler,
    };

    const oauth2TokenRoute: RouteProps = {
      path: "/oauth2/token",
      method: ApiGatewayV2.HttpMethod.POST,
      handler: oauth2TokenHandler,
    };

    const oauth2RevokeRoute: RouteProps = {
      path: "/oauth2/revoke",
      method: ApiGatewayV2.HttpMethod.POST,
      handler: oauth2RevokeHandler,
    };

    const routes: RouteProps<string, ApiGatewayV2.HttpMethod>[] = [
      loginRoute,
      confirmRoute,
      createClientRoute,
      oauth2AuthorizeRoute,
      oauth2TokenRoute,
      oauth2RevokeRoute,
    ];

    // Proxy Routes
    const proxyRoutes: ProxyRouteProps[] = [];

    routes.forEach((route) => this.httpApi.addRoute(route));
    proxyRoutes.forEach((route) => this.httpApi.addProxyRoute(route));

    new SSM.StringParameter(this, `AuthSecretIdSsmParameter_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/auth-secret-id`,
      stringValue: authSecret.secretArn,
    });

    new CDK.CfnOutput(this, `AuthorizerHandlerFunctionArnExport_${id}`, {
      exportName: ExportNames.AuthorizerHandlerFunctionArn,
      value: authorizerHandler.functionArn,
    });

    new CDK.CfnOutput(this, `AuthServiceBaseUrlExport_${id}`, { value: this.httpApi.apiURL });
  }
}
