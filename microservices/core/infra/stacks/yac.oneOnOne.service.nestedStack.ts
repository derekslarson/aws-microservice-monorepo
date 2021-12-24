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

export class YacOneOnOneServiceNestedStack extends NestedStack {
  constructor(scope: Stack, id: string, props: YacOneOnOneServiceNestedStackProps) {
    super(scope, id, props);

    const {
      api,
      environmentVariables,
      basePolicy,
      coreTableFullAccessPolicyStatement,
      imageS3BucketFullAccessPolicyStatement,
      openSearchFullAccessPolicyStatement,
    } = props;

    const createOneOnOnesHandler = new Lambda.Function(this, `CreateOneOnOnes_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/createOneOnOnes`),
      handler: "createOneOnOnes.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const deleteOneOnOneHandler = new Lambda.Function(this, `DeleteOneOnOne_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/deleteOneOnOne`),
      handler: "deleteOneOnOne.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const getOneOnOnesByUserIdHandler = new Lambda.Function(this, `GetOneOnOnesByUserId_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/getOneOnOnesByUserId`),
      handler: "getOneOnOnesByUserId.handler",
      environment: environmentVariables,
      memorySize: 2048,
      architecture: Lambda.Architecture.ARM_64,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
      timeout: Duration.seconds(15),
    });

    const routes: RouteProps[] = [
      {
        path: "/users/{userId}/one-on-ones",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: createOneOnOnesHandler,
        restricted: true,
      },
      {
        path: "/users/{userId}/one-on-ones",
        method: ApiGatewayV2.HttpMethod.GET,
        handler: getOneOnOnesByUserIdHandler,
        restricted: true,
      },
      {
        path: "/one-on-ones/{oneOnOneId}",
        method: ApiGatewayV2.HttpMethod.DELETE,
        handler: deleteOneOnOneHandler,
        restricted: true,
      },
    ];

    routes.forEach((route) => api.addRoute(route));
  }
}

export interface YacOneOnOneServiceNestedStackProps extends YacNestedStackProps {
  openSearchFullAccessPolicyStatement: IAM.PolicyStatement;
}
