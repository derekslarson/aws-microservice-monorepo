/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as IAM from "@aws-cdk/aws-iam";
import * as Cognito from "@aws-cdk/aws-cognito";
import * as SSM from "@aws-cdk/aws-ssm";
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
  AuthServiceSignUpPath,
  AuthServiceSignUpMethod,
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
} from "@yac/core";
import { IYacHttpServiceProps, YacHttpServiceStack } from "@yac/core/infra/stacks/yac.http.service.stack";

export type IYacAuthServiceStackProps = IYacHttpServiceProps;

export class YacAuthServiceStack extends YacHttpServiceStack {
  public readonly api: HttpApi;

  constructor(scope: CDK.Construct, id: string, props: IYacAuthServiceStackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const ExportNames = generateExportNames(environment === Environment.Local ? developer : environment);

    const secret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/secret`);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    const websiteBucket = new S3.Bucket(this, `${id}-idYacCom`, {
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      removalPolicy: CDK.RemovalPolicy.DESTROY,
    });

    const distributionOriginRequestPolicy = new CloudFront.OriginRequestPolicy(this, `${id}-idYacComDistributionOriginRequestPolicy`, {
      originRequestPolicyName: `${id}-idYacComDistributionOriginRequestPolicy`,
      cookieBehavior: {
        behavior: "whitelist",
        cookies: [ "XSRF-TOKEN" ],
      },
    });

    const websiteDistribution = new CloudFront.Distribution(this, `${id}-idYacComDistribution`, {
      defaultBehavior: {
        origin: new CFOrigins.S3Origin(websiteBucket),
        originRequestPolicy: { originRequestPolicyId: distributionOriginRequestPolicy.originRequestPolicyId },
      },
      certificate: this.certificate,
      domainNames: [ `${this.recordName}-assets.${this.zoneName}` ],
    });

    const cnameRecord = new Route53.CnameRecord(this, `${id}-CnameRecord`, {
      domainName: websiteDistribution.distributionDomainName,
      zone: this.hostedZone,
      recordName: `${this.recordName}-assets`,
    });

    new S3Deployment.BucketDeployment(this, `${id}-idYacComDeployment`, {
      sources: [ S3Deployment.Source.asset("ui/build") ],
      destinationBucket: websiteBucket,
    });

    // User Pool and Yac Client
    const userPool = new Cognito.UserPool(this, `UserPool_${id}`, {
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      signInAliases: { email: true },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
      customAttributes: { authChallenge: new Cognito.StringAttribute({ mutable: true }) },
    });

    const userPoolDomain = new Cognito.UserPoolDomain(this, `UserPoolDomain_${id}`, {
      userPool,
      cognitoDomain: { domainPrefix: `${this.recordName}-yac-auth-service` },
    });

    const userPoolDomainUrl = `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`;

    const resourceServerIdentifier = "yac";

    const resourceServerScopes: Cognito.ResourceServerScope[] = [
      { scopeName: "message.read", scopeDescription: "Read messages" },
      { scopeName: "message.write", scopeDescription: "Write messages" },
      { scopeName: "message.delete", scopeDescription: "Delete messages" },
    ];

    new Cognito.UserPoolResourceServer(this, `ResourceServer_${id}`, {
      userPool,
      identifier: resourceServerIdentifier,
      scopes: resourceServerScopes,
    });

    const clientScopes = resourceServerScopes.map((scopeItem) => ({ scopeName: `${resourceServerIdentifier}/${scopeItem.scopeName}` }));

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

    const describeCognitoUserPoolClient = new CustomResources.AwsCustomResource(this, "DescribeCognitoUserPoolClient", {
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
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Trace}`,
      API_DOMAIN: `https://${this.httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`,
      USER_POOL_ID: userPool.userPoolId,
      USER_POOL_DOMAIN: userPoolDomainUrl,
      YAC_USER_POOL_CLIENT_ID: yacUserPoolClient.userPoolClientId,
      YAC_USER_POOL_CLIENT_SECRET: yacUserPoolClientSecret,
      MAIL_SENDER: "no-reply@yac.com",
      YAC_AUTH_UI: yacUserPoolClientRedirectUri,
    };

    // Handlers
    const signUpHandler = new Lambda.Function(this, `SignUpHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/signUp"),
      handler: "signUp.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, sendEmailPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const loginHandler = new Lambda.Function(this, `LoginHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/login"),
      handler: "login.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement, sendEmailPolicyStatement ],
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
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const deleteClientHandler = new Lambda.Function(this, `DeleteClientHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/deleteClient"),
      handler: "deleteClient.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, userPoolPolicyStatement ],
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

    const preSignUpHandler = new Lambda.Function(this, `PreSignUpHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/preSignUp"),
      handler: "preSignUp.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(15),
    });

    const defineAuthChallengeHandler = new Lambda.Function(this, `DefineAuthChallengeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/defineAuthChallenge"),
      handler: "defineAuthChallenge.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(15),
    });

    const createAuthChallengeHandler = new Lambda.Function(this, `CreateAuthChallengeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/createAuthChallenge"),
      handler: "createAuthChallenge.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(15),
    });

    const verifyAuthChallengeResponseHandler = new Lambda.Function(this, `VerifyAuthChallengeResponseHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/verifyAuthChallengeResponse"),
      handler: "verifyAuthChallengeResponse.handler",
      layers: [ dependencyLayer ],
      initialPolicy: basePolicy,
      timeout: CDK.Duration.seconds(15),
    });

    userPool.addTrigger(Cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpHandler);
    userPool.addTrigger(Cognito.UserPoolOperation.DEFINE_AUTH_CHALLENGE, defineAuthChallengeHandler);
    userPool.addTrigger(Cognito.UserPoolOperation.CREATE_AUTH_CHALLENGE, createAuthChallengeHandler);
    userPool.addTrigger(Cognito.UserPoolOperation.VERIFY_AUTH_CHALLENGE_RESPONSE, verifyAuthChallengeResponseHandler);

    // Lambda Routes
    const signUpRoute: RouteProps<AuthServiceSignUpPath, AuthServiceSignUpMethod> = {
      path: "/sign-up",
      method: ApiGatewayV2.HttpMethod.POST,
      handler: signUpHandler,
    };

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
      path: "/oauth2/clients/{id}",
      method: ApiGatewayV2.HttpMethod.DELETE,
      handler: deleteClientHandler,
    };

    const oauth2AuthorizeRoute: RouteProps<AuthServiceOauth2AuthorizePath, AuthServiceOauth2AuthorizeMethod> = {
      path: "/oauth2/authorize",
      method: ApiGatewayV2.HttpMethod.GET,
      handler: oauth2AuthorizeHandler,
    };

    const routes: RouteProps<string, ApiGatewayV2.HttpMethod>[] = [
      signUpRoute,
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

    new CDK.CfnOutput(this, `YacUserPoolClientId-${id}`, {
      exportName: ExportNames.YacUserPoolClientId,
      value: yacUserPoolClient.userPoolClientId,
    });

    new CDK.CfnOutput(this, `YacUserPoolClientSecret-${id}`, {
      exportName: ExportNames.YacUserPoolClientSecret,
      value: yacUserPoolClientSecret,
    });

    new CDK.CfnOutput(this, `YacUserPoolClientRedirectUri-${id}`, {
      exportName: ExportNames.YacUserPoolClientRedirectUri,
      value: yacUserPoolClientRedirectUri,
    });

    new CDK.CfnOutput(this, "AuthServiceBaseUrl", { value: this.httpApi.apiURL });
  }
}
