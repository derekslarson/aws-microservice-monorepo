/* eslint-disable no-new */
import {
  Stack,
  StackProps,
  aws_lambda as Lambda,
  aws_ec2 as EC2,
  aws_efs as EFS,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import {HttpMethod } from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpApi } from "@yac/util/infra/constructs/http.api";
import { Function } from "@yac/util/infra/constructs/lambda.function";

export class YacChunkedUploadTestingStack extends Stack {
  constructor(scope: Construct, id: string, props: YacChunkedUploadTestingStackProps) {
    super(scope, id, { stackName: id, ...props });

    const { domainNameAttributes, vpcAttributes, fileSystemAttributes } = props;

    // Environment Variables
    const environmentVariables: Record<string, string> = { FS_PATH: "/mnt/messages" };
    
    const efsFileSystemSecurityGroup = EC2.SecurityGroup.fromSecurityGroupId(this, `FileSystemSecurityGroup_${id}`, fileSystemAttributes.securityGroupId);

    const vpc = EC2.Vpc.fromVpcAttributes(this, `VPC_${id}`, vpcAttributes)
   
    const lambdaSecurityGroup = new EC2.SecurityGroup(this, `LambdaSecurityGroup_${id}`, {
      vpc,
      allowAllOutbound: true,
      description: `Security Rule to deploy all lambdas that wanna have access to MessageEFS_${id} instance`,
    });

    efsFileSystemSecurityGroup.addIngressRule(lambdaSecurityGroup, EC2.Port.tcp(2049), "for any member of LambdaSecurityGroup");

    
    const efsFileSystem = EFS.FileSystem.fromFileSystemAttributes(this, `EfsFileSystem_${id}`, {
      fileSystemId: fileSystemAttributes.id,
      securityGroup: efsFileSystemSecurityGroup
    });

    const  efsFileSystemAccessPoint =  EFS.AccessPoint.fromAccessPointAttributes(this, `EfsAccessPoint_${id}`, {
      accessPointId: fileSystemAttributes.accessPointId,
      fileSystem: efsFileSystem
    });
        
    const lambdaFileSystem = Lambda.FileSystem.fromEfsAccessPoint(efsFileSystemAccessPoint, "/mnt/messages");

    // SNS Event Lambda Handler
    const checkEFSLambda = new Function(this, `CheckEfsHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/checkEFS`,
      securityGroups: [ lambdaSecurityGroup ],
      vpc,
      environment: environmentVariables,
      filesystem: lambdaFileSystem
    });

    const deleteFromEFSLambda = new Function(this, `DeleteFromEfsHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/deleteFromEFS`,
      securityGroups: [ lambdaSecurityGroup ],
      vpc,
      environment: environmentVariables,
      filesystem: lambdaFileSystem
    });

    const api = new HttpApi(this, `HttpApi_${id}`, {
      serviceName: "chunkedupload-testing",
      domainName: ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `DomainName_${id}`, domainNameAttributes),
    });
    
    api.addRoute({
      path: "/{fileName}/{chunkNumber}",
      handler: checkEFSLambda,
      method: HttpMethod.GET,
    })

    api.addRoute({
      path: "/{fileName}",
      handler: deleteFromEFSLambda,
      method: HttpMethod.DELETE,
    }) 
  }
}


export interface YacChunkedUploadTestingStackProps extends StackProps {
  domainNameAttributes: ApiGatewayV2.DomainNameAttributes;
  vpcAttributes: {
    vpcId: string;
    availabilityZones: string[];
    isolatedSubnetIds: string[];
  };
  fileSystemAttributes: {
    id: string;
    securityGroupId: string;
    accessPointId: string;
  };
}
