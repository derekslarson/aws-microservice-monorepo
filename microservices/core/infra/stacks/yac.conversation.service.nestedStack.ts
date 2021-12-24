import {
  Duration,
  Stack,
  NestedStack,
  aws_lambda as Lambda,
  aws_iam as IAM,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacConversationServiceNestedStack extends NestedStack {
  constructor(scope: Stack, id: string, props: YacConversationServiceNestedStackProps) {
    super(scope, id, props);

    const {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
      enhancedMessageS3BucketFullAccessPolicyStatement,
      openSearchFullAccessPolicyStatement,
    } = props;

    const getOneOnOnesAndGroupsByUserIdHandler = new Lambda.Function(this, `GetOneOnOnesAndGroupsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset("dist/handlers/getOneOnOnesAndGroupsByUserId"),
      handler: "getOneOnOnesAndGroupsByUserId.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, enhancedMessageS3BucketFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/users/{userId}/one-on-ones-and-groups",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getOneOnOnesAndGroupsByUserIdHandler,
        restricted: true,
      },
    ];

    routes.forEach((route) => api.addRoute(route));
  }
}

export interface YacConversationServiceNestedStackProps extends YacNestedStackProps {
  enhancedMessageS3BucketFullAccessPolicyStatement: IAM.PolicyStatement;
  openSearchFullAccessPolicyStatement: IAM.PolicyStatement;
}
