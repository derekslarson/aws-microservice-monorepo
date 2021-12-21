import {
  custom_resources as CustomResources,
  aws_iam as IAM,
} from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Construction properties for ElasticsearchAccessPolicy
 */
export interface ElasticsearchAccessPolicyProps {
  /**
   * The Elasticsearch Domain name
   */
  readonly domainName: string;

  /**
   * The Elasticsearch Domain ARN
   */
  readonly domainArn: string;

  /**
   * The access policy statements for the Elasticsearch cluster
   */
  readonly accessPolicies: IAM.PolicyStatement[];
}

/**
 * Creates LogGroup resource policies.
 */
export class ElasticsearchAccessPolicy extends CustomResources.AwsCustomResource {
  constructor(scope: Construct, id: string, props: ElasticsearchAccessPolicyProps) {
    const policyDocument = new IAM.PolicyDocument({ statements: props.accessPolicies });

    super(scope, id, {
      resourceType: "Custom::ElasticsearchAccessPolicy",
      onUpdate: {
        action: "updateElasticsearchDomainConfig",
        service: "ES",
        parameters: {
          DomainName: props.domainName,
          AccessPolicies: JSON.stringify(policyDocument.toJSON()),
        },
        // this is needed to limit the response body, otherwise it exceeds the CFN 4k limit
        outputPaths: [ "DomainConfig.ElasticsearchClusterConfig.AccessPolicies" ],
        physicalResourceId: CustomResources.PhysicalResourceId.of(`${props.domainName}AccessPolicy`),
      },
      policy: CustomResources.AwsCustomResourcePolicy.fromSdkCalls({ resources: [ props.domainArn ] }),
    });
  }
}
