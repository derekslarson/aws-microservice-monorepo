import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as IAM from "@aws-cdk/aws-iam";
import { RouteProps } from "@yac/util";
import { YacHttpServiceStack } from "@yac/util/infra/stacks/yac.http.service.stack";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class YacFriendServiceNestedStack extends CDK.NestedStack {
  constructor(scope: YacHttpServiceStack, id: string, props: YacFriendServiceNestedStackProps) {
    super(scope, id, props);

    const {
      dependencyLayer,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
      openSearchFullAccessPolicyStatement,
    } = props;

    const addUsersAsFriendsHandler = new Lambda.Function(this, `AddUsersAsFriends_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/addUsersAsFriends"),
      handler: "addUsersAsFriends.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const removeUserAsFriendHandler = new Lambda.Function(this, `RemoveUserAsFriend_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/removeUserAsFriend"),
      handler: "removeUserAsFriend.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const getFriendsByUserIdHandler = new Lambda.Function(this, `GetFriendsByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/getFriendsByUserId"),
      handler: "getFriendsByUserId.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      memorySize: 2048,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
      timeout: CDK.Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/users/{userId}/friends",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: addUsersAsFriendsHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/friends",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getFriendsByUserIdHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/friends/{friendId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: removeUserAsFriendHandler,
        restricted: true,
      },
    ];

    routes.forEach((route) => scope.httpApi.addRoute(route));
  }
}

export interface YacFriendServiceNestedStackProps extends YacNestedStackProps {
  openSearchFullAccessPolicyStatement: IAM.PolicyStatement;
}
