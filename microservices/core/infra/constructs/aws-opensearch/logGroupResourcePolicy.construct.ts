import {
  custom_resources as CustomResources,
  aws_iam as IAM,
} from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Construction properties for LogGroupResourcePolicy
 */
export interface LogGroupResourcePolicyProps {
  /**
   * The log group resource policy name
   */
  readonly policyName: string;
  /**
   * The policy statements for the log group resource logs
   */
  readonly policyStatements: [IAM.PolicyStatement];
}

/**
 * Creates LogGroup resource policies.
 */
export class LogGroupResourcePolicy extends CustomResources.AwsCustomResource {
  constructor(scope: Construct, id: string, props: LogGroupResourcePolicyProps) {
    const policyDocument = new IAM.PolicyDocument({
      statements: props.policyStatements,
    });

    super(scope, id, {
      resourceType: 'Custom::CloudwatchLogResourcePolicy',
      onUpdate: {
        service: 'CloudWatchLogs',
        action: 'putResourcePolicy',
        parameters: {
          policyName: props.policyName,
          policyDocument: JSON.stringify(policyDocument),
        },
        physicalResourceId: CustomResources.PhysicalResourceId.of(id),
      },
      onDelete: {
        service: 'CloudWatchLogs',
        action: 'deleteResourcePolicy',
        parameters: {
          policyName: props.policyName,
        },
        ignoreErrorCodesMatching: '400',
      },
      policy: CustomResources.AwsCustomResourcePolicy.fromSdkCalls({ resources: ['*'] }),
    });
  }
}