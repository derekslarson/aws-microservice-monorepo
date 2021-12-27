/* eslint-disable no-new */
import {
  RemovalPolicy,
  Duration,
  aws_s3 as S3,
  aws_iam as IAM,
  aws_lambda as Lambda,
  aws_secretsmanager as SecretsManager,
  aws_ec2 as EC2,
  aws_efs as EFS,
  StackProps,
  Stack,
} from "aws-cdk-lib";
import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2-alpha";
import { Construct } from "constructs";
import { LogLevel } from "@yac/util/src/enums/logLevel.enum";
import { Environment } from "@yac/util/src/enums/environment.enum";
import { HttpApi, RouteProps } from "@yac/util/infra/constructs/http.api";

export class YacChunkedUploadServiceStack extends Stack {
  public vpc: EC2.Vpc;

  public fileSystem: {
    id: string;
    securityGroupId: string;
    accessPointId: string;
  };

  constructor(scope: Construct, id: string, props: YacChunkedUploadServiceStackProps) {
    super(scope, id, props);

    const { environment, domainName, s3Buckets, secrets } = props;

    const mountedPath = "/mnt/messages";

    const getMessageUploadTokenSecretPolicyStatement = new IAM.PolicyStatement({
      actions: [ "secretsmanager:GetSecretValue" ],
      resources: [ secrets.messageUploadToken.secretArn ],
    });

    // Environment Variables
    const environmentVariables: Record<string, string> = {
      ENVIRONMENT: environment,
      LOG_LEVEL: environment === Environment.Local ? `${LogLevel.Trace}` : `${LogLevel.Error}`,
      RAW_MESSAGE_S3_BUCKET_NAME: s3Buckets.rawMessage.bucketName,
      EFS_MOUNTED_PATH: mountedPath,
      MESSAGE_UPLOAD_TOKEN_SECRET_ID: secrets.messageUploadToken.secretArn,
    };

    // vpc
    this.vpc = new EC2.Vpc(this, `Vpc_${id}`, {
      subnetConfiguration: [ { name: "main", subnetType: EC2.SubnetType.ISOLATED } ],
      gatewayEndpoints: { [`S3GatewayEndpoint_${id}`]: { service: { name: `com.amazonaws.${this.region}.s3` } } },
    });

    this.vpc.addInterfaceEndpoint(`SMInterfaceEndpoint_${id}`, { service: { port: 443, name: `com.amazonaws.${this.region}.secretsmanager` } });

    new S3.CfnAccessPoint(this, `VpcMessageBucketAccessPoint_${id}`, {
      bucket: s3Buckets.rawMessage.bucketName,
      name: `access-point-${id.toLowerCase().replace("_", "-")}`,
      vpcConfiguration: { vpcId: this.vpc.vpcId },
    });

    const efsFileSystemSecurityGroup = new EC2.SecurityGroup(this, `EFSSecurityGroup_${id}`, {
      vpc: this.vpc,
      allowAllOutbound: true,
    });

    const efsFileSystem = new EFS.FileSystem(this, `MessageEFS_${id}`, { vpc: this.vpc, removalPolicy: RemovalPolicy.DESTROY, securityGroup: efsFileSystemSecurityGroup });

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

    const uploadMessageChunkFileHandler = new Lambda.Function(this, `UploadMessageChunkHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/chunkUpload`),
      handler: "chunkUpload.handler",
      environment: environmentVariables,
      timeout: Duration.minutes(2),
      memorySize: 1024, // 1gb
      vpc: this.vpc,
      filesystem: lambdaFileSystem,
      initialPolicy: [ getMessageUploadTokenSecretPolicyStatement ],
    });

    const finishChunkUploadHandler = new Lambda.Function(this, `FinishChunkUploadHandler_${id}`, {
      runtime: Lambda.Runtime.NODEJS_14_X,
      code: Lambda.Code.fromAsset(`${__dirname}/../../dist/handlers/finishChunkUpload`),
      handler: "finishChunkUpload.handler",
      environment: environmentVariables,
      timeout: Duration.minutes(5),
      memorySize: 1024 * 4, // 4gb
      vpc: this.vpc,
      filesystem: lambdaFileSystem,
      initialPolicy: [ getMessageUploadTokenSecretPolicyStatement ],
    });

    s3Buckets.rawMessage.grantReadWrite(finishChunkUploadHandler);

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
      domainName,
    });

    routes.forEach((route) => api.addRoute(route));

    this.fileSystem = {
      id: efsFileSystem.fileSystemId,
      securityGroupId: efsFileSystemSecurityGroup.securityGroupId,
      accessPointId: efsFileSystemAccessPoint.accessPointId,
    };

    // const ExportNames = generateExportNames(stackPrefix);

    // new CfnOutput(this, `ChunkedUploadsFSIdExport_${id}`, {
    //   exportName: ExportNames.ChunkedUploadsFSId,
    //   value: this.fileSystem.fileSystemId,
    // });

    // new CfnOutput(this, `ChunkedUploadsFSAccessPointIdExport_${id}`, {
    //   exportName: ExportNames.ChunkedUploadsFSAccessPointId,
    //   value: accessPoint.accessPointId,
    // });

    // new CfnOutput(this, `ChunkedUploadsFSAccessPathExport_${id}`, {
    //   exportName: ExportNames.ChunkedUploadsFSMountedPath,
    //   value: mountedPath,
    // });

    // new CfnOutput(this, `ChunkedUploadsVPCIdExport_${id}`, {
    //   exportName: ExportNames.ChunkedUploadsVPCId,
    //   value: this.vpc.vpcId,
    // });

    // new CfnOutput(this, `ChunkedUploadsVPCAvailabilityZoneExport_${id}`, {
    //   exportName: ExportNames.ChunkedUploadsVPCAvailabilityZone,
    //   value: this.vpc.availabilityZones.join(","),
    // });

    // new SSM.StringParameter(this, `ChunkedUploadsLambdaSecurityGroupId_${id}`, {
    //   parameterName: `/yac-api-v4/${stackPrefix}/chunked-uploads-lambda-security-group-id`,
    //   stringValue: lambdaSecurityGroup.securityGroupId,
    // });

    // new SSM.StringParameter(this, `ChunkedUploadsFileSystemSecurityGroupId_${id}`, {
    //   parameterName: `/yac-api-v4/${stackPrefix}/chunked-uploads-fs-security-group-id`,
    //   stringValue: fileSystemSecurityGroup.securityGroupId,
    // });

    // new SSM.StringParameter(this, `ChunkedUploadsVPCId_${id}`, {
    //   parameterName: `/yac-api-v4/${stackPrefix}/chunked-uploads-vpc-id`,
    //   stringValue: this.vpc.vpcId,
    // });
  }
}

export interface YacChunkedUploadServiceStackProps extends StackProps {
  environment: Environment;
  domainName: ApiGatewayV2.IDomainName;
  s3Buckets: {
    rawMessage: S3.IBucket;
  };
  secrets: {
    messageUploadToken: SecretsManager.Secret;
  };
}
