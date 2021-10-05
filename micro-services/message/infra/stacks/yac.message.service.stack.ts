/* eslint-disable no-new */
import * as CDK from "@aws-cdk/core";
import * as Lambda from "@aws-cdk/aws-lambda";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";
import * as EFS from "@aws-cdk/aws-efs";
import * as SSM from "@aws-cdk/aws-ssm";
import * as S3 from "@aws-cdk/aws-s3";
import * as EC2 from "@aws-cdk/aws-ec2";
import * as SecretsManager from "@aws-cdk/aws-secretsmanager";
import * as IAM from "@aws-cdk/aws-iam";
import {
  Environment,
  LogLevel,
  RouteProps,
  generateExportNames,
} from "@yac/util";
import { YacHttpServiceStack, IYacHttpServiceProps } from "@yac/util/infra/stacks/yac.http.service.stack";
import { Duration } from "@aws-cdk/core";

export class YacMessageService extends YacHttpServiceStack {
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

    // APIs
    const { httpApi } = this;

    // Secret imports from Util
    const messageUploadTokenSecretArn = CDK.Fn.importValue(ExportNames.MessageUploadTokenSecretArn);

    // S3 Bucket ARN Imports from Util
    const messageS3BucketArn = CDK.Fn.importValue(ExportNames.RawMessageS3BucketArn);
    const rawMessageS3Bucket = S3.Bucket.fromBucketArn(this, `MessageS3Bucket_${id}`, messageS3BucketArn);
    const mountedPath = "/mnt/messages";

    // Secrets
    const messageUploadTokenSecret = SecretsManager.Secret.fromSecretCompleteArn(this, `MessageUploadTokenSecret_${id}`, messageUploadTokenSecretArn);

    const getMessageUploadTokenSecretPolicyStatement = new IAM.PolicyStatement({
      actions: [ "secretsmanager:GetSecretValue" ],
      resources: [ messageUploadTokenSecret.secretArn ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      RAW_MESSAGE_S3_BUCKET_NAME: rawMessageS3Bucket.bucketName,
      EFS_MOUNTED_PATH: mountedPath,
      MESSAGE_UPLOAD_TOKEN_SECRET_ID: messageUploadTokenSecret.secretArn,
    };

    // vpc
    const vpc = new EC2.Vpc(this, `Vpc_${id}`, {
      subnetConfiguration: [ { name: "main", subnetType: EC2.SubnetType.ISOLATED } ],
      gatewayEndpoints: { [`S3GatewayEndpoint_${id}`]: { service: { name: `com.amazonaws.${this.region}.s3` } } },
    });

    vpc.addInterfaceEndpoint(`SMInterfaceEndpoint_${id}`, { service: { port: 443, name: `com.amazonaws.${this.region}.secretsmanager` } });

    new S3.CfnAccessPoint(this, `VpcMessageBucketAccessPoint_${id}`, {
      bucket: rawMessageS3Bucket.bucketName,
      name: `access-point-${id.toLowerCase().replace("_", "-")}`,
      vpcConfiguration: { vpcId: vpc.vpcId },
    });

    const lambdaSecurityGroup = new EC2.SecurityGroup(this, `LambdaSecurityGroup_${id}`, {
      vpc,
      allowAllOutbound: true,
      description: `Security Rule to deploy all lambdas that wanna have access to MessageEFS_${id} instance`,
    });

    const fileSystemSecurityGroup = new EC2.SecurityGroup(this, `EFSSecurityGroup_${id}`, {
      vpc,
      allowAllOutbound: true,
    });
    fileSystemSecurityGroup.addIngressRule(lambdaSecurityGroup, EC2.Port.tcp(2049), "for any member of LambdaSecurityGroup");

    const fileSystem = new EFS.FileSystem(this, `MessageEFS_${id}`, { vpc, removalPolicy: CDK.RemovalPolicy.DESTROY, securityGroup: fileSystemSecurityGroup });

    // create a new access point from the filesystem
    const accessPoint = fileSystem.addAccessPoint(`AccessPoint_${id}`, {
      // set /export/lambda as the root of the access point
      path: "/export/lambda",
      // as /export/lambda does not exist in a new efs filesystem, the efs will create the directory with the following createAcl
      createAcl: {
        ownerUid: "1001",
        ownerGid: "1001",
        permissions: "750",
      },
      // enforce the POSIX identity so lambda function will access with this identity
      posixUser: {
        uid: "1001",
        gid: "1001",
      },
    });

    const FSAccessPoint = Lambda.FileSystem.fromEfsAccessPoint(accessPoint, mountedPath);

    const uploadMessageChunkFileHandler = new Lambda.Function(this, `UploadMessageChunkHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/chunkUpload"),
      handler: "chunkUpload.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      timeout: Duration.minutes(2),
      memorySize: 1024, // 1gb
      vpc,
      // mount the access point to /mnt/msg in the lambda runtime environment
      filesystem: FSAccessPoint,
      initialPolicy: [ getMessageUploadTokenSecretPolicyStatement ],
    });

    const finishChunkUploadHandler = new Lambda.Function(this, `FinishChunkUploadHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_12_X,
      code: Lambda.Code.fromAsset("dist/handlers/finishChunkUpload"),
      handler: "finishChunkUpload.handler",
      layers: [ dependencyLayer ],
      environment: environmentVariables,
      timeout: Duration.minutes(5),
      memorySize: 1024 * 4, // 4gb
      vpc,
      // mount the access point to /mnt/msg in the lambda runtime environment
      filesystem: FSAccessPoint,
      initialPolicy: [ getMessageUploadTokenSecretPolicyStatement ],
    });

    rawMessageS3Bucket.grantReadWrite(finishChunkUploadHandler);

    // Lambda Routes
    const routes: RouteProps[] = [
      {
        path: "/chunk",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: uploadMessageChunkFileHandler,
      }, {
        path: "/finish",
        method: ApiGatewayV2.HttpMethod.POST,
        handler: finishChunkUploadHandler,
      },
    ];

    routes.forEach((route) => httpApi.addRoute(route));

    new CDK.CfnOutput(this, `ChunkedUploadsFSIdExport_${id}`, {
      exportName: ExportNames.ChunkedUploadsFSId,
      value: fileSystem.fileSystemId,
    });

    new CDK.CfnOutput(this, `ChunkedUploadsFSAccessPointIdExport_${id}`, {
      exportName: ExportNames.ChunkedUploadsFSAccessPointId,
      value: accessPoint.accessPointId,
    });

    new CDK.CfnOutput(this, `ChunkedUploadsFSAccessPathExport_${id}`, {
      exportName: ExportNames.ChunkedUploadsFSMountedPath,
      value: mountedPath,
    });

    new CDK.CfnOutput(this, `ChunkedUploadsVPCIdExport_${id}`, {
      exportName: ExportNames.ChunkedUploadsVPCId,
      value: vpc.vpcId,
    });

    new CDK.CfnOutput(this, `ChunkedUploadsVPCAvailabilityZoneExport_${id}`, {
      exportName: ExportNames.ChunkedUploadsVPCAvailabilityZone,
      value: vpc.availabilityZones.join(","),
    });

    new SSM.StringParameter(this, `ChunkedUploadsLambdaSecurityGroupId_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/chunked-uploads-lambda-security-group-id`,
      stringValue: lambdaSecurityGroup.securityGroupId,
    });

    new SSM.StringParameter(this, `ChunkedUploadsFileSystemSecurityGroupId_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/chunked-uploads-fs-security-group-id`,
      stringValue: fileSystemSecurityGroup.securityGroupId,
    });

    new SSM.StringParameter(this, `ChunkedUploadsVPCId_${id}`, {
      parameterName: `/yac-api-v4/${stackPrefix}/chunked-uploads-vpc-id`,
      stringValue: vpc.vpcId,
    });
  }
}
