import {
  Stack,
  NestedStack,
  aws_iam as IAM,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { RouteProps } from "@yac/util/infra/constructs/http.api";
import { Function } from "@yac/util/infra/constructs/lambda.function";
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

    const createOneOnOnesHandler = new Function(this, `CreateOneOnOnes_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/createOneOnOnes`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const deleteOneOnOneHandler = new Function(this, `DeleteOneOnOne_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/deleteOneOnOne`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement ],
    });

    const getOneOnOnesByUserIdHandler = new Function(this, `GetOneOnOnesByUserId_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/getOneOnOnesByUserId`,
      environment: environmentVariables,
      initialPolicy: [ ...basePolicy, coreTableFullAccessPolicyStatement, imageS3BucketFullAccessPolicyStatement, openSearchFullAccessPolicyStatement ],
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
