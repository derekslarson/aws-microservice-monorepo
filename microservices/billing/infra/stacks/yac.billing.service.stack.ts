/* eslint-disable no-new */
import {
  Fn,
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
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Construct } from "constructs";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/util/infra/stacks/yac.http.service.stack";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

export class YacBillingServiceStack extends YacHttpServiceStack {
  constructor(scope: Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    // SNS Topic ARN Imports from Util
    const organizationCreatedSnsTopicArn = Fn.importValue(ExportNames.OrganizationCreatedSnsTopicArn);
    const userAddedToOrganizationSnsTopicArn = Fn.importValue(ExportNames.UserAddedToOrganizationSnsTopicArn);
    const userRemovedFromOrganizationSnsTopicArn = Fn.importValue(ExportNames.UserRemovedFromOrganizationSnsTopicArn);
    const billingPlanUpdatedSnsTopicArn = Fn.importValue(ExportNames.BillingPlanUpdatedSnsTopicArn);

    // Manually Set SSM Parameters for Stripe
    const stripeApiKey = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/stripe-api-key`);
    const stripeFreePlanProductId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/stripe-free-plan-product-id`);
    const stripePaidPlanProductId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/stripe-paid-plan-product-id`);
    const stripeWebhookSecret = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/stripe-webhook-secret`);

    // SNS Topics
    const organizationCreatedSnsTopic = SNS.Topic.fromTopicArn(this, `OrganizationCreatedSnsTopic_${id}`, organizationCreatedSnsTopicArn);
    const userAddedToOrganizationSnsTopic = SNS.Topic.fromTopicArn(this, `UserAddedToOrganizationSnsTopic_${id}`, userAddedToOrganizationSnsTopicArn);
    const userRemovedFromOrganizationSnsTopic = SNS.Topic.fromTopicArn(this, `UserRemovedFromOrganizationSnsTopic_${id}`, userRemovedFromOrganizationSnsTopicArn);

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
      resources: [ billingPlanUpdatedSnsTopicArn ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      BILLING_TABLE_NAME: billingTable.tableName,
      STRIPE_API_KEY: stripeApiKey,
      STRIPE_FREE_PLAN_PRODUCT_ID: stripeFreePlanProductId,
      STRIPE_PAID_PLAN_PRODUCT_ID: stripePaidPlanProductId,
      STRIPE_WEBHOOK_SECRET: stripeWebhookSecret,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      GSI_TWO_INDEX_NAME: GlobalSecondaryIndex.Two,
      ORGANIZATION_CREATED_SNS_TOPIC_ARN: organizationCreatedSnsTopicArn,
      USER_ADDED_TO_ORGANIZATION_SNS_TOPIC_ARN: userAddedToOrganizationSnsTopicArn,
      USER_REMOVED_FROM_ORGANIZATION_SNS_TOPIC_ARN: userRemovedFromOrganizationSnsTopicArn,
      BILLING_PLAN_UPDATED_SNS_TOPIC_ARN: billingPlanUpdatedSnsTopicArn,
    };

    const sqsEventHandlerQueue = new SQS.Queue(this, `SqsEventHandlerQueue_${id}`, {});

    organizationCreatedSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userAddedToOrganizationSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userRemovedFromOrganizationSnsTopic.addSubscription(new SnsSubscriptions.SqsSubscription(sqsEventHandlerQueue));

    // Dynamo Stream Handler
    new Lambda.Function(this, `BillingTableEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/billingTableEvent"),
      handler: "billingTableEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, billingTableFullAccessPolicyStatement, billingPlanUpdatedSnsPublishPolicyStatement ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.DynamoEventSource(billingTable, { startingPosition: Lambda.StartingPosition.LATEST }),
      ],
    });

    new Lambda.Function(this, `SqsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/sqsEvent"),
      handler: "sqsEvent.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, billingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
      events: [
        new LambdaEventSources.SqsEventSource(sqsEventHandlerQueue),
      ],
    });

    const sendPendingQuantityUpdatesToStripeHandler = new Lambda.Function(this, `SendPendingQuantityUpdatesToStripeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/sendPendingQuantityUpdatesToStripe"),
      handler: "sendPendingQuantityUpdatesToStripe.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, billingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const rule = new Events.Rule(this, `SendPendingQuantityUpdatesToStripeChronRule_${id}`, { schedule: Events.Schedule.rate(Duration.minutes(1)) });
    rule.addTarget(new EventsTargets.LambdaFunction(sendPendingQuantityUpdatesToStripeHandler));

    const getBillingPortalUrlHandler = new Lambda.Function(this, `GetBillingPortalUrlHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/getBillingPortalUrl"),
      handler: "getBillingPortalUrl.handler",
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, billingTableFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const stripeWebhookHandler = new Lambda.Function(this, `StripeWebhookHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/stripeWebhook"),
      handler: "stripeWebhook.handler",
      environment: environmentVariables,
      memorySize: 2048,
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

    routes.forEach((route) => this.httpApi.addRoute(route));

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `BillingTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/billing-table-name`,
      stringValue: billingTable.tableName,
    });
  }
}
