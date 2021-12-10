/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as SSM from "@aws-cdk/aws-ssm";
import * as SNS from "@aws-cdk/aws-sns";
import * as SNSSubscriptions from "@aws-cdk/aws-sns-subscriptions";
import * as SQS from "@aws-cdk/aws-sqs";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as Events from "@aws-cdk/aws-events";
import * as EventsTargets from "@aws-cdk/aws-events-targets";
import { Environment, generateExportNames, LogLevel, RouteProps } from "@yac/util";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/util/infra/stacks/yac.http.service.stack";
import { GlobalSecondaryIndex } from "../../src/enums/globalSecondaryIndex.enum";

export class YacBillingServiceStack extends YacHttpServiceStack {
  constructor(scope: CDK.Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    // SNS Topic ARN Imports from Util
    const organizationCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.OrganizationCreatedSnsTopicArn);
    const userAddedToOrganizationSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedToOrganizationSnsTopicArn);

    // Manually Set SSM Parameters for Stripe
    const stripeApiKey = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/stripe-api-key`);
    const stripeFreePlanPriceId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/stripe-free-plan-price-id`);
    const stripePaidPlanProductId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/stripe-paid-plan-product-id`);

    // SNS Topics
    const organizationCreatedSnsTopic = SNS.Topic.fromTopicArn(this, `OrganizationCreatedSnsTopic_${id}`, organizationCreatedSnsTopicArn);
    const userAddedToOrganizationSnsTopic = SNS.Topic.fromTopicArn(this, `UserAddedToOrganizationSnsTopic_${id}`, userAddedToOrganizationSnsTopicArn);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    // Databases
    const billingTable = new DynamoDB.Table(this, `BillingTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
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

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      BILLING_TABLE_NAME: billingTable.tableName,
      STRIPE_API_KEY: stripeApiKey,
      STRIPE_FREE_PLAN_PRICE_ID: stripeFreePlanPriceId,
      STRIPE_PAID_PLAN_PRODUCT_ID: stripePaidPlanProductId,
      GSI_ONE_INDEX_NAME: GlobalSecondaryIndex.One,
      GSI_TWO_INDEX_NAME: GlobalSecondaryIndex.Two,
      ORGANIZATION_CREATED_SNS_TOPIC_ARN: organizationCreatedSnsTopicArn,
      USER_ADDED_TO_ORGANIZATION_SNS_TOPIC_ARN: userAddedToOrganizationSnsTopicArn,
    };

    const sqsEventHandlerQueue = new SQS.Queue(this, `SqsEventHandlerQueue_${id}`, {});
    organizationCreatedSnsTopic.addSubscription(new SNSSubscriptions.SqsSubscription(sqsEventHandlerQueue));
    userAddedToOrganizationSnsTopic.addSubscription(new SNSSubscriptions.SqsSubscription(sqsEventHandlerQueue));

    // SQS Event Handler
    new Lambda.Function(this, `SqsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/sqsEvent"),
      handler: "sqsEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, billingTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SqsEventSource(sqsEventHandlerQueue),
      ],
    });

    const sendPendingQuantityUpdatesToStripeHandler = new Lambda.Function(this, `SendPendingQuantityUpdatesToStripeHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/sendPendingQuantityUpdatesToStripe"),
      handler: "sendPendingQuantityUpdatesToStripe.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, billingTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const rule = new Events.Rule(this, `RotateJwksChronRule_${id}`, { schedule: Events.Schedule.rate(CDK.Duration.minutes(1)) });
    rule.addTarget(new EventsTargets.LambdaFunction(sendPendingQuantityUpdatesToStripeHandler));

    const getBillingPortalUrlHandler = new Lambda.Function(this, `GetBillingPortalUrlHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getBillingPortalUrl"),
      handler: "getBillingPortalUrl.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, billingTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/organizations/{organizationId}/billing-portal-url",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getBillingPortalUrlHandler,
        restricted: true,
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
