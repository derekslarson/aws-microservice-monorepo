/* eslint-disable no-new */
import {
  RemovalPolicy,
  Duration,
  aws_ssm as SSM,
  aws_sns as SNS,
  aws_sns_subscriptions as SnsSubscriptions,
  aws_sqs as SQS,
  aws_dynamodb as DynamoDB,
  aws_iam as IAM,
  aws_events as Events,
  aws_events_targets as EventsTargets,
  aws_lambda as Lambda,
  aws_lambda_event_sources as LambdaEventSources,
  StackProps,
  Stack,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Construct } from "constructs";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";
import { HttpApi, RouteProps } from "@yac/util/infra/constructs/http.api";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

export class YacBillingServiceStack extends Stack {
  constructor(scope: Construct, id: string, props: YacBillingServiceStackProps) {
    super(scope, id, { stackName: id, ...props });

    const { environment, domainNameAttributes, authorizerHandlerFunctionArn, snsTopicArns, stripe } = props;

    // SNS Topics
    const organizationCreatedSnsTopic = SNS.Topic.fromTopicArn(this, `OrganizationCreatedSnsTopic_${id}`, snsTopicArns.organizationCreated);
    const userAddedToOrganizationSnsTopic = SNS.Topic.fromTopicArn(this, `UserAddedToOrganizationSnsTopic_${id}`, snsTopicArns.userAddedToOrganization);
    const userRemovedFromOrganizationSnsTopic = SNS.Topic.fromTopicArn(this, `UserRemovedFromOrganizationSnsTopic_${id}`, snsTopicArns.userRemovedFromOrganization);

    // Databases
    const billingTable = new DynamoDB.Table(this, `BillingTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      stream: DynamoDB.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    billingTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.One,
      partitionKey: { name: "gsi1pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi1sk", type: DynamoDB.AttributeType.STRING },
    });

    billingTable.addGlobalSecondaryIndex({
      indexName: GlobalSecondaryIndex.Two,
      partitionKey: { name: "gsi2pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "gsi2sk", type: DynamoDB.AttributeType.STRING },
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const billingTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ billingTable.tableArn, `${billingTable.tableArn}/*` ],
    });

    const billingPlanUpdatedSnsPublishPolicyStatement = new IAM.PolicyStatement({
      actions: [ "SNS:Publish" ],
      resources: [ snsTopicArns.billingPlanUpdated ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      BILLING_TABLE_NAME: billingTable.tableName,
      STRIPE_API_KEY: stripe.apiKey,
      STRIPE_FREE_PLAN_PRODUCT_ID: stripe.freePlanProductId,
      STRIPE_PAID_PLAN_PRODUCT_ID: stripe.paidPlanProductId,
      STRIPE_WEBHOOK_SECRET: stripe.webhookSecret,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      GSI_TWO_INDEX_NAME: GlobalSecondaryIndex.Two,
      ORGANIZATION_CREATED_SNS_TOPIC_ARN: snsTopicArns.organizationCreated,
      USER_ADDED_TO_ORGANIZATION_SNS_TOPIC_ARN: snsTopicArns.userAddedToOrganization,
      USER_REMOVED_FROM_ORGANIZATION_SNS_TOPIC_ARN: snsTopicArns.userRemovedFromOrganization,
      BILLING_PLAN_UPDATED_SNS_TOPIC_ARN: snsTopicArns.billingPlanUpdated,
    };

    const sqsEventHandlerQueue = new SQS.Queue(this, `SqsEventHandlerQueue_${id}`, {});

    organizationCreatedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userAddedToOrganizationSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userRemovedFromOrganizationSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));

    // Dynamo Stream Handler
    new Lambda.Function(this, `BillingTableEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/billingTableEvent`),
      handler: "billingTableEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, billingTableFullAccessPolicyStatement, billingPlanUpdatedSnsPublishPolicyStatement ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.DynamoEventSource(billingTable, { startingPosition: Lambda.StartingPosition.LATEST }),
      ],
    });

    new Lambda.Function(this, `SqsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/sqsEvent`),
      handler: "sqsEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, billingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.SqsEventSource(sqsEventHandlerQueue),
      ],
    });

    const sendPendingQuantityUpdatesToStripeHandler = new Lambda.Function(this, `SendPendingQuantityUpdatesToStripeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/sendPendingQuantityUpdatesToStripe`),
      handler: "sendPendingQuantityUpdatesToStripe.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, billingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const rule = new Events.Rule(this, `SendPendingQuantityUpdatesToStripeChronRule_${id}`, { schedule: Events.Schedule.rate(Duration.minutes(1)) });
    rule.addTarget(new EventsTargets.LambdaFunction(sendPendingQuantityUpdatesToStripeHandler));

    const getBillingPortalUrlHandler = new Lambda.Function(this, `GetBillingPortalUrlHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/getBillingPortalUrl`),
      handler: "getBillingPortalUrl.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, billingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const stripeWebhookHandler = new Lambda.Function(this, `StripeWebhookHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/stripeWebhook`),
      handler: "stripeWebhook.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, billingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/organizations/{organizationId}/billing-portal-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getBillingPortalUrlHandler,
        restricted: true,
      },
      {
        path: "/stripe/webhook",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: stripeWebhookHandler,
      },
    ];

    const httpApi = new HttpApi(this, `HttpApi_${id}`, {
      serviceName: "billing",
      domainName: ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `DomainName_${id}`, domainNameAttributes),
      authorizerHandler: Lambda.Function.fromFunctionArn(this, `AuthorizerHandler_${id}`, authorizerHandlerFunctionArn),
    });

    routes.forEach((route) => httpApi.addRoute(route));

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `BillingTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${environment}/billing-table-name`,
      stringValue: billingTable.tableName,
    });
  }
}

export interface YacBillingServiceStackProps extends StackProps {
  environment: string;
  domainNameAttributes: ApiGatewayV2.DomainNameAttributes;
  authorizerHandlerFunctionArn: string;
  snsTopicArns: {
    userCreated: string;
    organizationCreated: string;
    userAddedToOrganization: string;
    userRemovedFromOrganization: string;
    billingPlanUpdated: string;
  };
  stripe: {
    apiKey: string;
    freePlanProductId: string;
    paidPlanProductId: string;
    webhookSecret: string;
  }
}
