/* eslint-disable max-len */
/* eslint-disable no-new */
import {
  RemovalPolicy,
  Duration,
  aws_s3 as S3,
  aws_iam as IAM,
  aws_lambda as Lambda,
  aws_ec2 as EC2,
  aws_efs as EFS,
  StackProps,
  Stack,
  CfnOutput,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Construct } from "constructs";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { HttpApi, RouteProps } from "@yac/util/infra/constructs/http.api";
import { generateExportNames } from "@yac/util/src/enums/exportNames.enum";
import { Function } from "@yac/util/infra/constructs/lambda.function";

export class YacChunkedUploadServiceStack extends Stack {
  public exports: YacChunkedUploadServiceStackExports;

  constructor(scope: Construct, id: string, props: YacChunkedUploadServiceStackProps) {
    super(scope, id, { stackName: id, ...props });

    const { environment, domainNameAttributes, s3BucketArns, secretArns } = props;

    const mountedPath = "/mnt/messages";

    const getMessageUploadTokenSecretPolicyStatement = new IAM.PolicyStatement({
      actions: [ "secretsmanager:GetSecretValue" ],
      resources: [ secretArns.messageUploadToken ],
    });

    // S3 Buckets
    const rawMessageS3Bucket = S3.Bucket.fromBucketArn(this, `RawMessageS3Bucket_${id}`, s3BucketArns.rawMessage);

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      RAW_MESSAGE_S3_BUCKET_NAME: rawMessageS3Bucket.bucketName,
      EFS_MOUNTED_PATH: mountedPath,
      MESSAGE_UPLOAD_TOKEN_SECRET_ID: secretArns.messageUploadToken,
    };

    // vpc
    const vpc = new EC2.Vpc(this, `Vpc_${id}`, {
      subnetConfiguration: [ { name: "main", subnetType: EC2.SubnetType.PRIVATE_ISOLATED } ],
      gatewayEndpoints: { [`S3GatewayEndpoint_${id}`]: { service: { name: `com.amazonaws.${this.region}.s3` } } },
    });

    vpc.addInterfaceEndpoint(`SMInterfaceEndpoint_${id}`, { service: { port: 443, name: `com.amazonaws.${this.region}.secretsmanager` } });

    new S3.CfnAccessPoint(this, `VpcMessageBucketAccessPoint_${id}`, {
      bucket: rawMessageS3Bucket.bucketName,
      name: `access-point-${id.toLowerCase().replace("_", "-")}`,
      vpcConfiguration: { vpcId: vpc.vpcId },
    });

    const efsFileSystemSecurityGroup = new EC2.SecurityGroup(this, `EFSSecurityGroup_${id}`, {
      vpc,
      allowAllOutbound: true,
    });

    const efsFileSystem = new EFS.FileSystem(this, `MessageEFS_${id}`, { vpc, removalPolicy: RemovalPolicy.DESTROY, securityGroup: efsFileSystemSecurityGroup });

    // create a new access point from the filesystem
    const efsFileSystemAccessPoint = efsFileSystem.addAccessPoint(`AccessPoint_${id}`, {
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

    const lambdaFileSystem = Lambda.FileSystem.fromEfsAccessPoint(efsFileSystemAccessPoint, mountedPath);

    const uploadMessageChunkFileHandler = new Function(this, `UploadMessageChunkHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/chunkUpload`,
      environment: environmentVariables,
      timeout: Duration.minutes(2),
      vpc,
      filesystem: lambdaFileSystem,
      initialPolicy: [ getMessageUploadTokenSecretPolicyStatement ],
    });

    const finishChunkUploadHandler = new Function(this, `FinishChunkUploadHandler_${id}`, {
      codePath: `${__dirname}/../../dist/handlers/finishChunkUpload`,
      environment: environmentVariables,
      timeout: Duration.minutes(5),
      memorySize: 1024 * 4, // 4gb
      vpc,
      filesystem: lambdaFileSystem,
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

    const api = new HttpApi(this, `HttpApi_${id}`, {
      serviceName: "chunked-upload",
      domainName: ApiGatewayV2.DomainName.fromDomainNameAttributes(this, `DomainName_${id}`, domainNameAttributes),
    });

    routes.forEach((route) => api.addRoute(route));

    const ExportNames = generateExportNames(environment);

    this.exports = {
      vpcAttributes: {
        vpcId: new CfnOutput(this, `ChunkedUploadVpcIdExport_${id}`, { exportName: ExportNames.ChunkedUploadVpcId, value: vpc.vpcId }).value as string,
        availabilityZones: (new CfnOutput(this, `ChunkedUploadVpcAvailabilityZonesExport_${id}`, { exportName: ExportNames.ChunkedUploadVpcAvailabilityZones, value: vpc.availabilityZones.join(",") }).value as string).split(","),
        isolatedSubnetIds: (new CfnOutput(this, `ChunkedUploadVpcIsolatedSubnetIdsExport_${id}`, { exportName: ExportNames.ChunkedUploadVpcIsolatedSubnetIds, value: vpc.isolatedSubnets.map((subnet) => subnet.subnetId).join(",") }).value as string).split(","),
      },
      fileSystemAttributes: {
        id: new CfnOutput(this, `ChunkedUploadFileSystemIdExport_${id}`, { exportName: ExportNames.ChunkedUploadFileSystemId, value: efsFileSystem.fileSystemId }).value as string,
        accessPointId: new CfnOutput(this, `ChunkedUploadFileSystemAccessPointIdExport_${id}`, { exportName: ExportNames.ChunkedUploadFileSystemAccessPointId, value: efsFileSystemAccessPoint.accessPointId }).value as string,
        securityGroupId: new CfnOutput(this, `ChunkedUploadFileSystemSecurityGroupIdExport_${id}`, { exportName: ExportNames.ChunkedUploadFileSystemSecurityGroupId, value: efsFileSystemSecurityGroup.securityGroupId }).value as string,
      },
    };
  }
}

export interface YacChunkedUploadServiceStackProps extends StackProps {
  environment: string;
  domainNameAttributes: ApiGatewayV2.DomainNameAttributes;
  s3BucketArns: {
    rawMessage: string;
  };
  secretArns: {
    messageUploadToken: string;
  };
}

export interface YacChunkedUploadServiceStackExports {
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
