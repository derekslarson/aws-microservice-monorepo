/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as DynamoDB from "@aws-cdk/aws-dynamodb";
import * as SNS from "@aws-cdk/aws-sns";
import * as SSM from "@aws-cdk/aws-ssm";
import * as IAM from "@aws-cdk/aws-iam";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as LambdaEventSources from "@aws-cdk/aws-lambda-event-sources";
import { Environment, generateExportNames } from "@yac/util";

export class YacCoreTestingStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    // Imported SNS Topic ARNs from Util
    const userAddedToTeamSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedToTeamSnsTopicArn);
    const userRemovedFromTeamSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedFromTeamSnsTopicArn);
    const userAddedToGroupSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedToGroupSnsTopicArn);
    const userRemovedFromGroupSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedFromGroupSnsTopicArn);
    const userAddedToMeetingSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedToMeetingSnsTopicArn);
    const userRemovedFromMeetingSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedFromMeetingSnsTopicArn);
    const userAddedAsFriendSnsTopicArn = CDK.Fn.importValue(ExportNames.UserAddedAsFriendSnsTopicArn);
    const userRemovedAsFriendSnsTopicArn = CDK.Fn.importValue(ExportNames.UserRemovedAsFriendSnsTopicArn);
    const teamCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.TeamCreatedSnsTopicArn);
    const meetingCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.MeetingCreatedSnsTopicArn);
    const groupCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.GroupCreatedSnsTopicArn);
    const friendMessageCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.FriendMessageCreatedSnsTopicArn);
    const groupMessageCreatedSnsTopicArn = CDK.Fn.importValue(ExportNames.GroupMessageCreatedSnsTopicArn);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });
        
    // Databases
    const snsEventTable = new DynamoDB.Table(this, `SnsEventTable_${id}`, {
      billingMode: DynamoDB.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "pk", type: DynamoDB.AttributeType.STRING },
      sortKey: { name: "sk", type: DynamoDB.AttributeType.STRING },
      removalPolicy: CDK.RemovalPolicy.DESTROY,
    });

    // Policies
    const basePolicy: IAM.PolicyStatement[] = [];

    const snsEventTableFullAccessPolicyStatement = new IAM.PolicyStatement({
      actions: [ "dynamodb:*" ],
      resources: [ snsEventTable.tableArn, `${snsEventTable.tableArn}/*` ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = { SNS_EVENT_TABLE_NAME: snsEventTable.tableName };

    // SNS Event Lambda Handler
    new Lambda.Function(this, `SnsEventHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/snsEvent"),
      handler: "snsEvent.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, snsEventTableFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
      events: [
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserAddedToTeamSnsTopic_${id}`, userAddedToTeamSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserRemovedFromTeamSnsTopic_${id}`, userRemovedFromTeamSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserAddedToGroupSnsTopic_${id}`, userAddedToGroupSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserRemovedFromGroupSnsTopic_${id}`, userRemovedFromGroupSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserAddedToMeetingSnsTopic_${id}`, userAddedToMeetingSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserRemovedFromMeetingSnsTopic_${id}`, userRemovedFromMeetingSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserAddedAsFriendSnsTopic_${id}`, userAddedAsFriendSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `UserRemovedAsFriendSnsTopic_${id}`, userRemovedAsFriendSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `TeamCreatedSnsTopic_${id}`, teamCreatedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `MeetingCreatedSnsTopic_${id}`, meetingCreatedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `GroupCreatedSnsTopic_${id}`, groupCreatedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `FriendMessageCreatedSnsTopic_${id}`, friendMessageCreatedSnsTopicArn)),
        new LambdaEventSources.SnsEventSource(SNS.Topic.fromTopicArn(this, `GroupMessageCreatedSnsTopic_${id}`, groupMessageCreatedSnsTopicArn)),
      ],
    });

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `ListenerMappingTableNameSsmParameter-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/core-testing-sns-event-table-name`,
      stringValue: snsEventTable.tableName,
    });
  }
}
