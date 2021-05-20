/* eslint-disable no-new */

import * as CDK from "@aws-cdk/core";
import * as ACM from "@aws-cdk/aws-certificatemanager";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import { generateExportNames } from "../../src/enums/exportNames.enum";
import { Environment } from "../../src/enums/environment.enum";

export class YacCoreServiceStack extends CDK.Stack {
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    const zoneName = "yacchat.com";
    const recordName = this.getRecordName();

    const certificate = ACM.Certificate.fromCertificateArn(this, `${id}-cert`, "arn:aws:acm:us-east-1:644653163171:certificate/77491685-9b9c-4d4a-9443-ac6463a67bbf");

    const domainName = `${recordName}.${zoneName}`;

    new ApiGatewayV2.DomainName(this, `${id}-DN`, { domainName, certificate });

    new CDK.CfnOutput(this, `${id}-DomainNameExport`, {
      exportName: ExportNames.DomainName,
      value: domainName,
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
