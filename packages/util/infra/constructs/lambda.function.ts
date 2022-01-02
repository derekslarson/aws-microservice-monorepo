/* eslint-disable no-nested-ternary */
/* eslint-disable no-new */
/* eslint-disable no-console */
import {
  aws_lambda as Lambda,
  Duration,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export class Function extends Lambda.Function {
  constructor(scope: Construct, id: string, props: FunctionProps) {
    super(scope, id, {
      functionName: id.length <= 64 ? id : id.slice(0, 64),
      runtime: Lambda.Runtime.NODEJS_14_X,
      memorySize: 1024,
      architecture: Lambda.Architecture.ARM_64,
      timeout: Duration.seconds(15),
      tracing: Lambda.Tracing.ACTIVE,
      handler: `${props.codePath.slice(props.codePath.lastIndexOf("/") + 1)}.handler`,
      code: Lambda.Code.fromAsset(props.codePath),
      ...props,
      environment: {
        ...props.environment,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
    });
  }
}

export type FunctionProps = Omit<Lambda.FunctionProps, "runtime" | "handler" | "code"> & { codePath: string };
