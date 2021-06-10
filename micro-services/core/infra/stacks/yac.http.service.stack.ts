/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as Route53 from "@aws-cdk/aws-route53";
import * as ACM from "@aws-cdk/aws-certificatemanager";
import * as SSM from "@aws-cdk/aws-ssm";
import * as CustomResources from "@aws-cdk/custom-resources";
import * as IAM from "@aws-cdk/aws-iam";
import * as SNS from "@aws-cdk/aws-sns";

import { HttpApi } from "../constructs/http.api";
import { Environment } from "../../src/enums/environment.enum";
import { generateExportNames } from "../..";

export interface IYacHttpServiceProps extends CDK.StackProps {
  serviceName: string;
}

export class YacHttpServiceStack extends CDK.Stack {
  public httpApi: HttpApi;

  public domainName: ApiGatewayV2.IDomainName;

  public hostedZone: Route53.IHostedZone;

  public certificate: ACM.ICertificate;

  public zoneName: string;

  public clientsUpdatedSnsTopic: SNS.ITopic;

  constructor(scope: CDK.Construct, id: string, props: IYacHttpServiceProps) {
    super(scope, id, props);
    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const ExportNames = generateExportNames(environment === Environment.Local ? developer : environment);

    const customDomainName = CDK.Fn.importValue(ExportNames.CustomDomainName);
    const regionalDomainName = CDK.Fn.importValue(ExportNames.RegionalDomainName);
    const regionalHostedZoneId = CDK.Fn.importValue(ExportNames.RegionalHostedZoneId);
    const userPoolId = CDK.Fn.importValue(ExportNames.UserPoolId);
    const clientsUpdatedSnsTopicArn = CDK.Fn.importValue(ExportNames.ClientsUpdatedSnsTopicArn);

    const certificateArn = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/certificate-arn`);
    const hostedZoneId = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-id`);
    this.zoneName = SSM.StringParameter.valueForStringParameter(this, `/yac-api-v4/${environment === Environment.Local ? Environment.Dev : environment}/hosted-zone-name`);

    this.hostedZone = Route53.HostedZone.fromHostedZoneAttributes(this, `${id}-HostedZone`, {
      zoneName: this.zoneName,
      hostedZoneId,
    });

    this.certificate = ACM.Certificate.fromCertificateArn(this, `${id}-cert`, certificateArn);

    this.domainName = ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `${id}-DomainName`, {
      name: customDomainName,
      regionalDomainName,
      regionalHostedZoneId,
    });

    this.clientsUpdatedSnsTopic = SNS.Topic.fromTopicArn(this, `${id}-ClientsUpdatedSnsTopic`, clientsUpdatedSnsTopicArn);

    this.httpApi = new HttpApi(this, `${id}-Api`, {
      serviceName: props.serviceName,
      domainName: this.domainName,
      corsAllowedOrigins: environment !== Environment.Prod ? [ `https://${this.recordName}-assets.yacchat.com` ] : [ "https://yac.com", "https://id.yac.com/", "https://app.yac.com/" ],
      jwtAuthorizer: {
        // We set this to be a placeholder initially, as it cant be empty.
        // In the custom resource below, it will be updated to all current clientIds
        jwtAudience: [ "placeholder" ],
        jwtIssuer: `https://cognito-idp.${this.region}.amazonaws.com/${userPoolId}`,
      },
    });

    new CustomResources.AwsCustomResource(this, `${id}-SetAuthorizerAudiences`, {
      resourceType: "Custom::SnsPublish",
      onCreate: {
        region: this.region,
        service: "SNS",
        action: "publish",
        parameters: {
          TopicArn: this.clientsUpdatedSnsTopic.topicArn,
          Message: JSON.stringify({ apiId: this.httpApi.apiId }),
        },
        physicalResourceId: CustomResources.PhysicalResourceId.of(this.clientsUpdatedSnsTopic.topicArn),
      },
      policy: CustomResources.AwsCustomResourcePolicy.fromStatements([
        new IAM.PolicyStatement({
          actions: [ "*" ],
          resources: [ "*" ],
        }),
      ]),
    });
  }

  public get recordName(): string {
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
      console.log(`${new Date().toISOString()} : Error in YacCoreServiceStackg recordName getter:\n`, error);

      throw error;
    }
  }
}
