import {
  Stack,
  NestedStack,
  aws_lambda as Lambda
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpApi, RouteProps } from "@yac/util/infra/constructs/http.api";
import { Function } from "@yac/util/infra/constructs/lambda.function";
import { YacNestedStackProps } from "./yacNestedStackProps.model";

export class ChildStack extends NestedStack {
  constructor(scope: Stack, id: string, httpApi: HttpApi) {
    super(scope, id);

    const handlerFunction = new Lambda.Function(this, "Handler", {
      functionName: "Handler",
      runtime: Lambda.Runtime.NODEJS_14_X,
      handler: `function.handler`,
      code: Lambda.Code.fromAsset('path/to/code'),
    });

    httpApi.addRoute(handlerFunction, ApiGatewayV2.HttpMethod.GET, "/mock/path")
  }
}
