/* eslint-disable no-new */
import {
  Stack,
  StackProps,
  Duration,
  aws_lambda as Lambda,
  aws_ec2 as EC2,
  aws_efs as EFS,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import {HttpMethod } from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpApi } from "@yac/util/infra/constructs/http.api";

export class YacChunkedUploadTestingStack extends Stack {
  constructor(scope: Construct, id: string, props: YacChunkedUploadTestingStackProps) {
    super(scope, id, props);

    const { domainName, vpc, fileSystem } = props;

    // Environment Variables
    const environmentVariables: Record<string, string> = { FS_PATH: "/mnt/messages" };
    
    const efsFileSystemSecurityGroup = EC2.SecurityGroup.fromSecurityGroupId(this, `FileSystemSecurityGroup_${id}`, fileSystem.securityGroupId);

    const lambdaSecurityGroup = new EC2.SecurityGroup(this, `LambdaSecurityGroup_${id}`, {
      vpc,
      allowAllOutbound: true,
      description: `Security Rule to deploy all lambdas that wanna have access to MessageEFS_${id} instance`,
    });

    efsFileSystemSecurityGroup.addIngressRule(lambdaSecurityGroup, EC2.Port.tcp(2049), "for any member of LambdaSecurityGroup");

    
    const efsFileSystem = EFS.FileSystem.fromFileSystemAttributes(this, `EfsFileSystem_${id}`, {
      fileSystemId: fileSystem.id,
      securityGroup: efsFileSystemSecurityGroup
    });

    const  efsFileSystemAccessPoint =  EFS.AccessPoint.fromAccessPointAttributes(this, `EfsAccessPoint_${id}`, {
      accessPointId: fileSystem.accessPointId,
      fileSystem: efsFileSystem
    });
        
    const lambdaFileSystem = Lambda.FileSystem.fromEfsAccessPoint(efsFileSystemAccessPoint, "/mnt/messages");

    // SNS Event Lambda Handler
    const checkEFSLambda = new Lambda.Function(this, `CheckEfsHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/checkEFS`),
      handler: "checkEFS.handler",
      securityGroups: [ lambdaSecurityGroup ],
      vpc,
      environment: environmentVariables,
      memorySize: 512,
      timeout: Duration.seconds(15),
      filesystem: lambdaFileSystem
    });

    const deleteFromEFSLambda = new Lambda.Function(this, `DeleteFromEfsHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/deleteFromEFS`),
      handler: "deleteFromEFS.handler",
      securityGroups: [ lambdaSecurityGroup ],
      vpc,
      environment: environmentVariables,
      memorySize: 512,
      timeout: Duration.seconds(15),
      filesystem: lambdaFileSystem
    });

    const api = new HttpApi(this, `HttpApi_${id}`, {
      serviceName: "chunkedupload-testing",
      domainName,
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
  domainName: ApiGatewayV2.IDomainName;
  vpc: EC2.Vpc;
  fileSystem: {
    id: string;
    securityGroupId: string;
    accessPointId: string;
  }
}
