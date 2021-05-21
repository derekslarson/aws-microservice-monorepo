/* eslint-disable no-new */

import * as CDK from "@aws-cdk/core";
import * as ACM from "@aws-cdk/aws-certificatemanager";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as SSM from "@aws-cdk/aws-ssm";
import { generateExportNames } from "../../src/enums/exportNames.enum";
import { Environment } from "../../src/enums/environment.enum";

export class YacCoreServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const hostedZoneName = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-name`);
    const certificateArn = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/certificate-arn`);

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    const recordName = this.getRecordName();

    const certificate = ACM.Certificate.fromCertificateArn(this, `${id}-cert`, certificateArn);

    const domainName = new ApiGatewayV2.DomainName(this, `${id}-DN`, { domainName: `${recordName}.${hostedZoneName}`, certificate });

    new CDK.CfnOutput(this, `${id}-CustomDomainNameExport`, {
      exportName: ExportNames.CustomDomainName,
      value: domainName.name,
    });

    new CDK.CfnOutput(this, `${id}-RegionalDomainNameExport`, {
      exportName: ExportNames.RegionalDomainName,
      value: domainName.regionalDomainName,
    });
  }

  private getRecordName(): string {
    try {
      const environment = this.node.tryGetContext("environment") as string;
      const developer = this.node.tryGetContext("developer") as string;

      if (environment === Environment.Prod) {
        return "api";
      }

      if (environment === Environment.Dev) {
        return "develop";
      }

      if (environment === Environment.Local) {
        return developer;
      }

      return environment;
    } catch (error) {
      console.log(`${new Date().toISOString()} : Error in YacCoreServiceStack.getRecordName:\n`, error);

      throw error;
    }
  }
}
