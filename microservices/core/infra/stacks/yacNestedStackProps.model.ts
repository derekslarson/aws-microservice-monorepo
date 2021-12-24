import { HttpApi } from "@yac/util/infra/constructs/http.api";
import { NestedStackProps, aws_iam as IAM } from "aws-cdk-lib";

export interface YacNestedStackProps extends NestedStackProps {
  api: HttpApi;
  environmentVariables: Record<string, string>;
  basePolicy: IAM.PolicyStatement[];
  coreTableFullAccessPolicyStatement: IAM.PolicyStatement;
  imageS3BucketFullAccessPolicyStatement: IAM.PolicyStatement;
}
