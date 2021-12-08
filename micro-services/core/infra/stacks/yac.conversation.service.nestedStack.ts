import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as IAM from "@aws-cdk/aws-iam";
import { RouteProps } from "@yac/util";
import { YacHttpServiceStack } from "@yac/util/infra/stacks/yac.http.service.stack";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacConversationServiceNestedStack extends CDK.NestedStack {
  constructor(scope: YacHttpServiceStack, id: string, props: YacConversationServiceNestedStackProps) {
    super(scope, id, props);

    const {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
      enhancedMessageS3BucketFullAccessPolicyStatement,
      openSearchFullAccessPolicyStatement,
    } = props;

    const getConversationsByUserIdHandler = new Lambda.Function(this, `GetConversationsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getConversationsByUserId"),
      handler: "getConversationsByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/users/{userId}/conversations",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getConversationsByUserIdHandler,
        restricted: true,
      },
    ];

    routes.forEach((route) => scope.httpApi.addRoute(route));
  }
}

export interface YacConversationServiceNestedStackProps extends YacNestedStackProps {
  enhancedMessageS3BucketFullAccessPolicyStatement: IAM.PolicyStatement;
  openSearchFullAccessPolicyStatement: IAM.PolicyStatement;
}
