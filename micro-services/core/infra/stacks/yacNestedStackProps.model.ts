import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as IAM from "@aws-cdk/aws-iam";

export interface YacNestedStackProps extends CDK.NestedStackProps {
  dependencyLayer: Lambda.LayerVersion;
  environmentVariables: Record<string, string>;
  basePolicy: IAM.PolicyStatement[];
  coreTableFullAccessPolicyStatement: IAM.PolicyStatement;
  imageS3BucketFullAccessPolicyStatement: IAM.PolicyStatement;
}
