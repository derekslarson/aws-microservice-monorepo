/* eslint-disable no-nested-ternary */
/* eslint-disable no-new */
import {
  RemovalPolicy,
  CfnOutput,
  Duration,
  Stack,
  StackProps,
  custom_resources as CustomResources,
  aws_certificatemanager as ACM,
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
import { Function } from "@yac/util/infra/constructs/lambda.function";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

export class YacAuthServiceStack extends Stack {
  public exports: YacAuthServiceExports;

  constructor(scope: Construct, id: string, props: YacAuthServiceStackProps) {
    super(scope, id, { stackName: id, ...props });

    const { environment, domainNameAttributes, snsTopicArns, certificateArn, hostedZoneAttributes, googleClient, slackClient } = props;

    // SNS Topics
    const createUserRequestSnsTopic = SNS.Topic.fromTopicArn(this, `CreateUserRequestSnsTopic_${id}`, snsTopicArns.createUserRequest);

    // SQS Queues
    const snsEventSqsQueue = new SQS.Queue(this, `SnsEventSqsQueue_${id}`);
    createUserRequestSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(snsEventSqsQueue));

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

    const recordName = environment === Environment.Prod ? "api-v4" : environment;

    const websiteDistribution = new CloudFront.Distribution(this, `IdYacComDistribution_${id}`, {
      defaultBehavior: {
        origin: new CloudFrontOrigins.S3Origin(websiteBucket),
        originRequestPolicy: { originRequestPolicyId: distributionOriginRequestPolicy.originRequestPolicyId },
      },
      certificate: ACM.Certificate.fromCertificateArn(this, `AcmCertificate_${id}`, certificateArn),
      domainNames: [ `${recordName}-assets.${hostedZoneAttributes.zoneName}` ],
    });

    const authUiCnameRecord = new Route53.CnameRecord(this, `CnameRecord_${id}`, {
      domainName: websiteDistribution.distributionDomainName,
      zone: Route53.HostedZone.fromHostedZoneAttributes(this, `HostedZone_${id}`, hostedZoneAttributes),
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
      resources: [ snsTopicArns.userCreated ],
    });

    // Because we can't reference a resource for a phone number to allow,
    // we have to allow everything except all valid arns, effectively only allowing phone numbers
    const sendTextPolicyStatement = new IAM.PolicyStatement({
      actions: [ "sns:Publish" ],
      notResources: [ "arn:aws:sns:*:*:*" ],
    });

    const basePolicy: IAM.PolicyStatement[] = [];

    const domainName = ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `DomainName_${id}`, domainNameAttributes);

    const api = new HttpApi(this, `Api_${id}`, {
      serviceName: "auth",
      domainName,
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      JWKS_URI: `https://cognito-idp.${this.region}.amazonaws.com/test/.well-known/jwks.json`,
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Info}`,
      API_URL: api.apiUrl,
      MAIL_SENDER: "no-reply@yac.com",
      YAC_AUTH_UI: `https://${authUiCnameRecord.domainName}`,
      USER_CREATED_SNS_TOPIC_ARN: snsTopicArns.userCreated,
      CREATE_USER_REQUEST_SNS_TOPIC_ARN: snsTopicArns.createUserRequest,
      AUTH_TABLE_NAME: authTable.tableName,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      GOOGLE_CLIENT_ID: googleClient.id,
      GOOGLE_CLIENT_SECRET: googleClient.secret,
      GOOGLE_CLIENT_REDIRECT_URI: `${api.apiUrl}/oauth2/idpresponse`,
      SLACK_CLIENT_ID: slackClient.id,
      SLACK_CLIENT_SECRET: slackClient.secret,
      SLACK_CLIENT_REDIRECT_URI: `${api.apiUrl}/oauth2/idpresponse`,
    };

    // Handlers
    new Function(this, `AuthTableEventHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/authTableEvent`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement, userCreatedSnsPublishPolicyStatement ],
      events: [
        new LambdaEventSources.DynamoEventSource(authTable, { startingPosition: Lambda.StartingPosition.LATEST }),
      ],
    });

    new Function(this, `SqsEventHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/sqsEvent`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
      events: [
        new LambdaEventSources.SqsEventSource(snsEventSqsQueue),
      ],
    });

    const authorizerHandler = new Function(this, `AuthorizerHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/authorizer`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
    });

    // Since the authorizer couldn't be added during the http api creation (authorizerHandler didn't exist yet) we need to add it here
    api.addAuthorizer(this, id, { authorizerHandler });

    const loginHandler = new Function(this, `LoginHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/login`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, sendEmailPolicyStatement, sendTextPolicyStatement, authTableFullAccessPolicyStatement ],
    });

    const loginViaExternalProviderHandler = new Function(this, `LoginViaExternalProviderHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/loginViaExternalProvider`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
    });

    const confirmHandler = new Function(this, `ConfirmHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/confirm`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
    });

    const createClientHandler = new Function(this, `CreateClientHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/createClient`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
    });

    const oauth2AuthorizeHandler = new Function(this, `Oauth2AuthorizeHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/oauth2Authorize`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
    });

    const oauth2TokenHandler = new Function(this, `Oauth2TokenHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/oauth2Token`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
    });

    const oauth2RevokeHandler = new Function(this, `Oauth2RevokeHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/oauth2Revoke`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
    });

    const oauth2UserInfoHandler = new Function(this, `Oauth2UserInfoHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/oauth2UserInfo`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
    });

    const oauth2IdpResponseHandler = new Function(this, `Oauth2IdpResponseHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/oauth2IdpResponse`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
    });

    const getPublicJwksHandler = new Function(this, `GetPublicJwksHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getPublicJwks`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
    });

    const rotateJwksHandler = new Function(this, `RotateJwksHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/rotateJwks`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, authTableFullAccessPolicyStatement ],
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
      authorizerHandler,
      corsPreflight: {
        allowCredentials: true,
        allowMethods: [ ApiGatewayV2.CorsHttpMethod.POST ],
        allowOrigins: [ `https://${authUiCnameRecord.domainName}` ],
      },
    });

    otpAuthFlowRoutes.forEach((route) => otpFlowApi.addRoute(route));

    const ExportNames = generateExportNames(environment);

    this.exports = {
      functionArns: { authorizerHandler: new CfnOutput(this, `AuthorizerHandlerFunctionArnExport_${id}`, { exportName: ExportNames.AuthorizerHandlerFunctionArn, value: authorizerHandler.functionArn }).value as string },
      tableNames: { auth: new CfnOutput(this, `AuthTableNameExport_${id}`, { exportName: ExportNames.AuthTableName, value: authTable.tableName }).value as string },
    };
  }
}

export interface YacAuthServiceStackProps extends StackProps {
  environment: string;
  domainNameAttributes: ApiGatewayV2.DomainNameAttributes;
  hostedZoneAttributes: Route53.HostedZoneAttributes;
  certificateArn: string;
  googleClient: {
    id: string;
    secret: string;
  };
  slackClient: {
    id: string;
    secret: string;
  };
  snsTopicArns: {
    createUserRequest: string;
    userCreated: string;
  };
}

export interface YacAuthServiceExports {
  functionArns: {
    authorizerHandler: string;
  };
  tableNames: {
    auth: string;
  }
}
