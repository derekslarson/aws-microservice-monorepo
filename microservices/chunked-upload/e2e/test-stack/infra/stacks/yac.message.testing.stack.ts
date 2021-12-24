/* eslint-disable no-new */
import {
  Fn,
  Duration,
  aws_ssm as SSM,
  aws_lambda as Lambda,
  aws_ec2 as EC2,
  aws_efs as EFS,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { YacHttpServiceStack, HttpServiceStackProps } from "@yac/util/infra/stacks/yac.http.service.stack";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2-alpha";

export class YacMessageTesting extends YacHttpServiceStack {
  constructor(scope: Construct, id: string, props: HttpServiceStackProps) {
    super(scope, id, props);

    const environment = this.node.tryGetContext("environment") as string;
    const developer = this.node.tryGetContext("developer") as string;

    if (!environment) {
      throw new Error("'environment' context param required.");
    }

    const stackPrefix = environment === Environment.Local ? developer : environment;

    const ExportNames = generateExportNames(stackPrefix);

    // Layers
    const dependencyLayer = new Lambda.LayerVersion(this, `DependencyLayer_${id}`, {
      compatibleRuntimes: [ Lambda.Runtime.NODEJS_12_X ],
      code: Lambda.Code.fromAsset("dist/dependencies"),
    });

    const FSFileSystemId = Fn.importValue(ExportNames.ChunkedUploadsFSId);
    const FSAccessPointId = Fn.importValue(ExportNames.ChunkedUploadsFSAccessPointId);
    const FSMountedPath = Fn.importValue(ExportNames.ChunkedUploadsFSMountedPath);
    
    const vpcId = SSM.StringParameter.valueFromLookup(this, `/yac-api-v4/${stackPrefix}/chunked-uploads-vpc-id`);
    const fileSystemSecurityGroupId = SSM.StringParameter.valueFromLookup(this, `/yac-api-v4/${stackPrefix}/chunked-uploads-fs-security-group-id`);
    const lambdaSecurityGroupId = SSM.StringParameter.valueFromLookup(this, `/yac-api-v4/${stackPrefix}/chunked-uploads-lambda-security-group-id`);

    const vpc = EC2.Vpc.fromLookup(this, `MessageTestVPC_${id}`, { vpcId })

    const securityGroup = EC2.SecurityGroup.fromLookupById(this, `FileSystemSecurityGroup_${id}`, fileSystemSecurityGroupId);
    const lambdaSecurityGroup = EC2.SecurityGroup.fromLookupById(this, `LambdaSecurityGroup_${id}`, lambdaSecurityGroupId);
    
    const fileSystem = EFS.FileSystem.fromFileSystemAttributes(this, `EFSFileSystem_${id}`, {
      fileSystemId: FSFileSystemId,
      securityGroup: securityGroup
    });
    
    const fsAccessPoint =  EFS.AccessPoint.fromAccessPointAttributes(this, `EfsAccessPoint_${id}`, {
      accessPointId: FSAccessPointId,
      fileSystem
    });
    const lambdaFS = Lambda.FileSystem.fromEfsAccessPoint(fsAccessPoint, FSMountedPath);
    
    // Environment Variables
    const environmentVariables: Record<string, string> = { FS_PATH: FSMountedPath };
    
    // SNS Event Lambda Handler
    const checkEFSLambda = new Lambda.Function(this, `CheckEFS_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/checkEFS"),
      handler: "checkEFS.handler",
      layers: [ dependencyLayer ],
      securityGroups: [lambdaSecurityGroup],
      vpc,
      environment: environmentVariables,
      memorySize: 512,
      timeout: Duration.seconds(15),
      filesystem: lambdaFS
    });

    const deleteFromEFSLambda = new Lambda.Function(this, `DeleteFromEFS_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/deleteFromEFS"),
      handler: "deleteFromEFS.handler",
      layers: [ dependencyLayer ],
      securityGroups: [lambdaSecurityGroup],
      vpc,
      environment: environmentVariables,
      memorySize: 512,
      timeout: Duration.seconds(15),
      filesystem: lambdaFS
    });
    
    this.httpApi.addRoute({
      path: "/{fileName}/{chunkNumber}",
      handler: checkEFSLambda,
      method: HttpMethod.GET,
    })

    this.httpApi.addRoute({
      path: "/{fileName}",
      handler: deleteFromEFSLambda,
      method: HttpMethod.DELETE,
    })

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `MessageTestingUtilsEndpoint_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/message-testing-utils-endpoint`,
      stringValue: this.httpApi.apiEndpoint,
    });
  }
}
