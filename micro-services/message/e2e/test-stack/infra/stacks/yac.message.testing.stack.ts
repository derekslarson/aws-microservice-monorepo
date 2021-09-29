/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as EC2 from "@aws-cdk/aws-ec2";
import * as EFS from "@aws-cdk/aws-efs";
import * as SSM from "@aws-cdk/aws-ssm";
import * as Lambda from "@aws-cdk/aws-lambda";
import { Environment, generateExportNames } from "@yac/util";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/util/infra/stacks/yac.http.service.stack";
import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export class YacMessageTesting extends YacHttpServiceStack {
  constructor(scope: CDK.Construct, id: string, props: IYacHttpServiceProps) {
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

    const FSFileSystemId = CDK.Fn.importValue(ExportNames.ChunkedUploadsFSId);
    const FSAccessPointId = CDK.Fn.importValue(ExportNames.ChunkedUploadsFSAccessPointId);
    const FSMountedPath = CDK.Fn.importValue(ExportNames.ChunkedUploadsFSMountedPath);
    
    const VPCId = SSM.StringParameter.valueFromLookup(this, SSMParameterNames.ChunkedUploadsVPCId);
    const VPCSecurityGroupId = SSM.StringParameter.valueFromLookup(this, SSMParameterNames.ChunkedUploadsVPCSecurityGroupId);

    const vpc = EC2.Vpc.fromLookup(this, `MessageTestVPC${id}`, {
      vpcId: VPCId
    })

    const fileSystem = EFS.FileSystem.fromFileSystemAttributes(this, `EFSFileSystem${id}`, {
      fileSystemId: FSFileSystemId,
      securityGroup: EC2.SecurityGroup.fromLookup(this, `SecurityGroup${id}`, VPCSecurityGroupId)
    });


    const fsAccessPoint =  EFS.AccessPoint.fromAccessPointAttributes(this, `EfsAccessPoint${id}`, {
      accessPointId: FSAccessPointId,
      fileSystem
    });
    const lambdaFS = Lambda.FileSystem.fromEfsAccessPoint(fsAccessPoint, FSMountedPath);

    // Environment Variables
    const environmentVariables: Record<string, string> = { FS_PATH: FSMountedPath };

    // SNS Event Lambda Handler
    const checkEFSLambda = new Lambda.Function(this, `CheckEFS${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/checkEFS"),
      handler: "checkEFS.handler",
      layers: [ dependencyLayer ],
      vpc,
      environment: environmentVariables,
      memorySize: 512,
      timeout: CDK.Duration.seconds(15),
      filesystem: lambdaFS
    });

    this.httpApi.addRoute({
      path: "/{fileName}/{chunkNumber}",
      handler: checkEFSLambda,
      method: HttpMethod.GET,
    })

    // SSM Parameters (to be imported in e2e tests)
    new SSM.StringParameter(this, `CheckEFSEndpoint-${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/check-efs-endpoint`,
      stringValue: this.httpApi.apiEndpoint,
    });
  }
}
