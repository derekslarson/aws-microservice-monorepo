/* eslint-disable max-len */
/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as CustomResources from "@aws-cdk/custom-resources";
import * as IAM from "@aws-cdk/aws-iam";
import * as SNS from "@aws-cdk/aws-sns";
import * as SNSSubscriptions from "@aws-cdk/aws-sns-subscriptions";
import * as SQS from "@aws-cdk/aws-sqs";
import * as SSM from "@aws-cdk/aws-ssm";
import * as Events from "@aws-cdk/aws-events";
import * as EventsTargets from "@aws-cdk/aws-events-targets";
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
    const googleClientId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/google-client-id`);
    const googleClientSecret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/google-client-secret`);
    const googleClientRedirectUri = `${this.httpApi.apiURL}/oauth2/idpresponse`;
    const slackClientId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/slack-client-id`);
    const slackClientSecret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/slack-client-secret`);
    const slackClientRedirectUri = `${this.httpApi.apiURL}/oauth2/idpresponse`;

    // SNS Topic ARN Imports from Util
    const userCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.UserCreatedSnsTopicArn);
    const createUserRequestSnsTopicArn = CDK.Fn.importValue(ExportNames.CreateUserRequestSnsTopicArn);

    // SNS Topics
    const createUserRequestSnsTopic = SNS.Topic.fromTopicArn(this, `CreateUserRequestSnsTopic_${id}`, createUserRequestSnsTopicArn);

    // SQS Queues
    const snsEventSqsQueue = new SQS.Queue(this, `SnsEventSqsQueue_${id}`);
    createUserRequestSnsTopic.addSubscription(new SNSSubscriptions.SqsSubscription(snsEventSqsQueue));

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
      stream: DynamoDB.StreamViewType.NEW_AND_OLD_IMAGES,
      timeToLiveAttribute: "ttl",
    });

    authTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.One,
      partitionKey: { name: "gsi1pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: DynamoDB.AttributeType.STRING },
    });

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

    // Policies
    const authTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ authTable.tableArn, `${authTable.tableArn}/*` ],
    });

    const sendEmailPolicyStatement = new IAM.PolicyStatement({
      actions: [ "ses:SendEmail", "ses:SendRawEmail" ],
      resources: [ "*" ],
    });

    const userCreatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ userCreatedSnsTopicArn ],
    });

    // Because we can't reference a resource for a phone number to allow,
    // we have to allow everything except all valid arns, effectively only allowing phone numbers
    const sendTextPolicyStatement = new IAM.PolicyStatement({
      actions: [ "sns:Publish" ],
      notResources: [ "arn:aws:sns:*:*:*" ],
    });

    const basePolicy: IAM.PolicyStatement[] = [];

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      JWKS_URI: `https://cognito-idp.${this.region}.amazonaws.com/test/.well-known/jwks.json`,
      ENVIRONMENT: environment,
      STACK_PREFIX: stackPrefix,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Info}`,
      API_DOMAIN: `https://${this.httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`,
      API_URL: this.httpApi.apiURL,
      MAIL_SENDER: "no-reply@yac.com",
      YAC_AUTH_UI: `https://${authUiCnameRecord.domainName}`,
      USER_CREATED_SNS_TOPIC_ARN: userCreatedSnsTopicArn,
      CREATE_USER_REQUEST_SNS_TOPIC_ARN: createUserRequestSnsTopicArn,
      AUTH_TABLE_NAME: authTable.tableName,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      GOOGLE_CLIENT_ID: googleClientId,
      GOOGLE_CLIENT_SECRET: googleClientSecret,
      GOOGLE_CLIENT_REDIRECT_URI: googleClientRedirectUri,
      SLACK_CLIENT_ID: slackClientId,
      SLACK_CLIENT_SECRET: slackClientSecret,
      SLACK_CLIENT_REDIRECT_URI: slackClientRedirectUri,
    };

    // Handlers
    new Lambda.Function(this, `AuthTableEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/authTableEvent"),
      handler: "authTableEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement, userCreatedSnsPublishPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.DynamoEventSource(authTable, { startingPosition: Lambda.StartingPosition.LATEST }),
      ],
    });

    new Lambda.Function(this, `SqsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/sqsEvent"),
      handler: "sqsEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SqsEventSource(snsEventSqsQueue),
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

    // Since the authorizer couldn't be added in the super call (authorizerHandler didn't exist yet) we need to add it here
    this.httpApi.addAuthorizer(this, id, { authorizerHandler });

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

    const loginViaExternalProviderHandler = new Lambda.Function(this, `LoginViaExternalProviderHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/loginViaExternalProvider"),
      handler: "loginViaExternalProvider.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const confirmHandler = new Lambda.Function(this, `ConfirmHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/confirm"),
      handler: "confirm.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
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

    const oauth2UserInfoHandler = new Lambda.Function(this, `Oauth2UserInfoHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/oauth2UserInfo"),
      handler: "oauth2UserInfo.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const oauth2IdpResponseHandler = new Lambda.Function(this, `Oauth2IdpResponseHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/oauth2IdpResponse"),
      handler: "oauth2IdpResponse.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getPublicJwksHandler = new Lambda.Function(this, `GetPublicJwksHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getPublicJwks"),
      handler: "getPublicJwks.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const rotateJwksHandler = new Lambda.Function(this, `RotateJwksHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/rotateJwks"),
      handler: "rotateJwks.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const rule = new Events.Rule(this, `RotateJwksChronRule_${id}`, { schedule: Events.Schedule.rate(CDK.Duration.minutes(20)) });
    rule.addTarget(new EventsTargets.LambdaFunction(rotateJwksHandler));

    new CustomResources.AwsCustomResource(this, `AddJwksToAuthTable_${id}`, {
      resourceType: "Custom::AddJwksToAuthTable",
      onCreate: {
        region: this.region,
        service: "Lambda",
        action: "invoke",
        parameters: { FunctionName: rotateJwksHandler.functionName },
        physicalResourceId: CustomResources.PhysicalResourceId.of(`AddJwksToAuthTable_${id}`),
      },
      policy: {
        statements: [
          new IAM.PolicyStatement({
            actions: [ "lambda:InvokeFunction" ],
            resources: [ rotateJwksHandler.functionArn ],
          }),
        ],
      },
    });

    const loginRoute: RouteProps = {
      path: "/login",
      method: ApiGatewayV2.HttpMethod.POST,
      handler: loginHandler,
    };

    const loginViaExternalProviderRoute: RouteProps = {
      path: "/login/idp",
      method: ApiGatewayV2.HttpMethod.GET,
      handler: loginViaExternalProviderHandler,
    };

    const confirmRoute: RouteProps = {
      path: "/confirm",
      method: ApiGatewayV2.HttpMethod.POST,
      handler: confirmHandler,
    };

    const createClientRoute: RouteProps = {
      path: "/oauth2/clients",
      method: ApiGatewayV2.HttpMethod.POST,
      handler: createClientHandler,
    };

    const oauth2AuthorizeRoute: RouteProps = {
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

    const oauth2IdpResponseRoute: RouteProps = {
      path: "/oauth2/idpresponse",
      method: ApiGatewayV2.HttpMethod.GET,
      handler: oauth2IdpResponseHandler,
    };

    const oauth2UserInfoRoute: RouteProps = {
      path: "/oauth2/userinfo",
      method: ApiGatewayV2.HttpMethod.GET,
      handler: oauth2UserInfoHandler,
      restricted: true,
    };

    const getPublicJwksRoute: RouteProps = {
      path: "/.well-known/jwks.json",
      method: ApiGatewayV2.HttpMethod.GET,
      handler: getPublicJwksHandler,
    };

    const routes: RouteProps<string, ApiGatewayV2.HttpMethod>[] = [
      loginRoute,
      loginViaExternalProviderRoute,
      confirmRoute,
      createClientRoute,
      oauth2AuthorizeRoute,
      oauth2TokenRoute,
      oauth2RevokeRoute,
      oauth2UserInfoRoute,
      oauth2IdpResponseRoute,
      getPublicJwksRoute,
    ];

    // Proxy Routes
    const proxyRoutes: ProxyRouteProps[] = [];

    routes.forEach((route) => this.httpApi.addRoute(route));
    proxyRoutes.forEach((route) => this.httpApi.addProxyRoute(route));

    new CDK.CfnOutput(this, `AuthorizerHandlerFunctionArnExport_${id}`, {
      exportName: ExportNames.AuthorizerHandlerFunctionArn,
      value: authorizerHandler.functionArn,
    });

    new CDK.CfnOutput(this, `AuthServiceBaseUrlExport_${id}`, { value: this.httpApi.apiURL });

    new SSM.StringParameter(this, `AuthTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/auth-table-name`,
      stringValue: authTable.tableName,
    });
  }
}
