/* eslint-disable no-nested-ternary */
/* eslint-disable no-new */
/* eslint-disable no-console */
import {
  aws_certificatemanager as ACM,
  aws_route53 as Route53,
  aws_route53_targets as Route53Targets,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Environment } from "../../src/enums/environment.enum";

export class DomainName extends ApiGatewayV2.DomainName {
  constructor(scope: Construct, id: string, props: DomainNameProps) {
    const { environment, certificateArn, hostedZoneId, hostedZoneName, recordNameSuffix } = props;

    const recordName = `${environment === Environment.Prod ? "api-v4" : environment === Environment.Dev ? "develop" : environment}${recordNameSuffix ? `-${recordNameSuffix}` : ""}`;

    super(scope, id, {
      domainName: `${recordName}.${hostedZoneName}`,
      certificate: ACM.Certificate.fromCertificateArn(scope, `AcmCertificate_${id}`, certificateArn),
    });

    new Route53.ARecord(this, `ARecord_${id}`, {
      zone: Route53.HostedZone.fromHostedZoneAttributes(this, `HostedZone_${id}`, { zoneName: hostedZoneName, hostedZoneId }),
      recordName,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.ApiGatewayv2DomainProperties(this.regionalDomainName, this.regionalHostedZoneId)),
    });
  }
}

interface DomainNameProps {
  environment: string;
  certificateArn: string;
  hostedZoneId: string;
  hostedZoneName: string;
  recordNameSuffix?: string;
}
