/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
/* eslint-disable no-new */
import {
  RemovalPolicy,
  CfnOutput,
  Duration,
  Stack,
  StackProps,
  custom_resources as CustomResources,
  aws_certificatemanager as ACM,
  aws_ssm as SSM,
  aws_sns as SNS,
  aws_sns_subscriptions as SnsSubscriptions,
  aws_sqs as SQS,
  aws_route53 as Route53,
  aws_dynamodb as DynamoDB,
  aws_iam as IAM,
  aws_s3 as S3,
  aws_s3_deployment as S3Deployment,
  aws_events as Events,
  aws_events_targets as EventsTargets,
  aws_lambda as Lambda,
  aws_lambda_event_sources as LambdaEventSources,
  aws_cloudfront as CloudFront,
  aws_cloudfront_origins as CloudFrontOrigins,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Construct } from "constructs";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";
import { HttpApi, ProxyRouteProps, RouteProps } from "@yac/util/infra/constructs/http.api";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

export class YacAuthServiceStack extends Stack {
  public authorizerHandler: Lambda.Function;

  constructor(scope: Construct, id: string, props: AuthServiceStackProps) {
    super(scope, id, props);

    const { environment, stackPrefix, domainName, snsTopics } = props;

    const hostedZoneName = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-name`);
    const hostedZoneId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-id`);
    const certificateArn = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/certificate-arn`);

    const googleClientId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/google-client-id`);
    const googleClientSecret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/google-client-secret`);
    const slackClientId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/slack-client-id`);
    const slackClientSecret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/slack-client-secret`);

    // SQS Queues
    const snsEventSqsQueue = new SQS.Queue(this, `SnsEventSqsQueue_${id}`);
    snsTopics.createUserRequest.addSubscription(new SnsSubscriptions.SqsSubscription(snsEventSqsQueue));

    // Tables
    const authTable = new DynamoDB.Table(this, `AuthTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
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
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const distributionOriginRequestPolicy = new CloudFront.OriginRequestPolicy(this, `idYacComDistributionOriginRequestPolicy_${id}`, {
      originRequestPolicyName: `idYacComDistributionOriginRequestPolicy_${id}`,
      cookieBehavior: {
        behavior: "whitelist",
        cookies: [ "XSRF-TOKEN" ],
      },
    });

    const recordName = environment === Environment.Prod ? "api-v4" : environment === Environment.Dev ? "develop" : stackPrefix;

    const certificate = ACM.Certificate.fromCertificateArn(this, `AcmCertificate_${id}`, certificateArn);

    const hostedZone = Route53.HostedZone.fromHostedZoneAttributes(this, `HostedZone_${id}`, {
      zoneName: hostedZoneName,
      hostedZoneId,
    });

    const websiteDistribution = new CloudFront.Distribution(this, `IdYacComDistribution_${id}`, {
      defaultBehavior: {
        origin: new CloudFrontOrigins.S3Origin(websiteBucket),
        originRequestPolicy: { originRequestPolicyId: distributionOriginRequestPolicy.originRequestPolicyId },
      },
      certificate,
      domainNames: [ `${recordName}-assets.${hostedZoneName}` ],
    });

    const authUiCnameRecord = new Route53.CnameRecord(this, `CnameRecord_${id}`, {
      domainName: websiteDistribution.distributionDomainName,
      zone: hostedZone,
      recordName: `${recordName}-assets`,
    });

    new S3Deployment.BucketDeployment(this, `IdYacComDeployment_${id}`, {
      sources: [ S3Deployment.Source.asset(`${__dirname}/../../ui/build`) ],
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
      resources: [ snsTopics.userCreated.topicArn ],
    });

    // Because we can't reference a resource for a phone number to allow,
    // we have to allow everything except all valid arns, effectively only allowing phone numbers
    const sendTextPolicyStatement = new IAM.PolicyStatement({
      actions: [ "sns:Publish" ],
      notResources: [ "arn:aws:sns:*:*:*" ],
    });

    const basePolicy: IAM.PolicyStatement[] = [];

    const api = new HttpApi(this, `Api_${id}`, {
      serviceName: "auth",
      domainName,
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      JWKS_URI: `https://cognito-idp.${this.region}.amazonaws.com/test/.well-known/jwks.json`,
      ENVIRONMENT: environment,
      STACK_PREFIX: stackPrefix,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Info}`,
      API_URL: api.apiUrl,
      MAIL_SENDER: "no-reply@yac.com",
      YAC_AUTH_UI: `https://${authUiCnameRecord.domainName}`,
      USER_CREATED_SNS_TOPIC_ARN: snsTopics.userCreated.topicArn,
      CREATE_USER_REQUEST_SNS_TOPIC_ARN: snsTopics.createUserRequest.topicArn,
      AUTH_TABLE_NAME: authTable.tableName,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      GOOGLE_CLIENT_ID: googleClientId,
      GOOGLE_CLIENT_SECRET: googleClientSecret,
      GOOGLE_CLIENT_REDIRECT_URI: `${api.apiUrl}/oauth2/idpresponse`,
      SLACK_CLIENT_ID: slackClientId,
      SLACK_CLIENT_SECRET: slackClientSecret,
      SLACK_CLIENT_REDIRECT_URI: `${api.apiUrl}/oauth2/idpresponse`,
    };

    // Handlers
    new Lambda.Function(this, `AuthTableEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/authTableEvent`),
      handler: "authTableEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement, userCreatedSnsPublishPolicyStatement ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.DynamoEventSource(authTable, { startingPosition: Lambda.StartingPosition.LATEST }),
      ],
    });

    new Lambda.Function(this, `SqsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/sqsEvent`),
      handler: "sqsEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.SqsEventSource(snsEventSqsQueue),
      ],
    });

    this.authorizerHandler = new Lambda.Function(this, `AuthorizerHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/authorizer`),
      handler: "authorizer.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    // Since the authorizer couldn't be added during the http api creation (authorizerHandler didn't exist yet) we need to add it here
    api.addAuthorizer(this, id, { authorizerHandler: this.authorizerHandler });

    const loginHandler = new Lambda.Function(this, `LoginHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/login`),
      handler: "login.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, sendEmailPolicyStatement, sendTextPolicyStatement, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const loginViaExternalProviderHandler = new Lambda.Function(this, `LoginViaExternalProviderHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/loginViaExternalProvider`),
      handler: "loginViaExternalProvider.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const confirmHandler = new Lambda.Function(this, `ConfirmHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/confirm`),
      handler: "confirm.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const createClientHandler = new Lambda.Function(this, `CreateClientHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/createClient`),
      handler: "createClient.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const oauth2AuthorizeHandler = new Lambda.Function(this, `Oauth2AuthorizeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/oauth2Authorize`),
      handler: "oauth2Authorize.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const oauth2TokenHandler = new Lambda.Function(this, `Oauth2TokenHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/oauth2Token`),
      handler: "oauth2Token.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const oauth2RevokeHandler = new Lambda.Function(this, `Oauth2RevokeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/oauth2Revoke`),
      handler: "oauth2Revoke.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const oauth2UserInfoHandler = new Lambda.Function(this, `Oauth2UserInfoHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/oauth2UserInfo`),
      handler: "oauth2UserInfo.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const oauth2IdpResponseHandler = new Lambda.Function(this, `Oauth2IdpResponseHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/oauth2IdpResponse`),
      handler: "oauth2IdpResponse.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getPublicJwksHandler = new Lambda.Function(this, `GetPublicJwksHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getPublicJwks`),
      handler: "getPublicJwks.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const rotateJwksHandler = new Lambda.Function(this, `RotateJwksHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/rotateJwks`),
      handler: "rotateJwks.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const rule = new Events.Rule(this, `RotateJwksChronRule_${id}`, { schedule: Events.Schedule.rate(Duration.minutes(20)) });
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

    const routes: RouteProps[] = [
      loginViaExternalProviderRoute,
      createClientRoute,
      oauth2AuthorizeRoute,
      oauth2TokenRoute,
      oauth2RevokeRoute,
      oauth2UserInfoRoute,
      oauth2IdpResponseRoute,
      getPublicJwksRoute,
    ];

    const proxyRoutes: ProxyRouteProps[] = [];

    routes.forEach((route) => api.addRoute(route));
    proxyRoutes.forEach((route) => api.addProxyRoute(route));

    const otpAuthFlowRoutes: RouteProps[] = [
      loginRoute,
      confirmRoute,
    ];

    const otpFlowApi = new HttpApi(this, `OtpFlowApi_${id}`, {
      serviceName: "auth-otp",
      domainName,
      authorizerHandler: this.authorizerHandler,
      corsPreflight: {
        allowCredentials: true,
        allowMethods: [ ApiGatewayV2.CorsHttpMethod.POST ],
        allowOrigins: [ `https://${authUiCnameRecord.domainName}` ],
      },
    });

    otpAuthFlowRoutes.forEach((route) => otpFlowApi.addRoute(route));

    const ExportNames = generateExportNames(stackPrefix);

    new CfnOutput(this, `AuthorizerHandlerFunctionArnExport_${id}`, {
      exportName: ExportNames.AuthorizerHandlerFunctionArn,
      value: this.authorizerHandler.functionArn,
    });

    new SSM.StringParameter(this, `AuthTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/auth-table-name`,
      stringValue: authTable.tableName,
    });
  }
}

export interface AuthServiceStackProps extends StackProps {
  environment: string;
  stackPrefix: string;
  domainName: ApiGatewayV2.IDomainName;
  snsTopics: {
    createUserRequest: SNS.ITopic;
    userCreated: SNS.ITopic;
  }
}
