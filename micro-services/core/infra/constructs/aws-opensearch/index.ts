/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-new */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-nested-ternary */
/* eslint-disable eqeqeq */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
import { URL } from "url";
import * as Elasticsearch from "@aws-cdk/aws-elasticsearch";
import * as ACM from "@aws-cdk/aws-certificatemanager";
import * as Cloudwatch from "@aws-cdk/aws-cloudwatch";
import * as EC2 from "@aws-cdk/aws-ec2";
import * as IAM from "@aws-cdk/aws-iam";
import * as Logs from "@aws-cdk/aws-logs";
import * as Route53 from "@aws-cdk/aws-route53";
import * as SecretsManager from "@aws-cdk/aws-secretsmanager";
import * as CDK from "@aws-cdk/core";
import { LogGroupResourcePolicy } from "./logGroupResourcePolicy.construct";
import { ElasticsearchAccessPolicy } from "./elasticsearchAccesPolicy.construct";

const ES_READ_ACTIONS = [
  "es:ESHttpGet",
  "es:ESHttpHead",
];

const ES_WRITE_ACTIONS = [
  "es:ESHttpDelete",
  "es:ESHttpPost",
  "es:ESHttpPut",
  "es:ESHttpPatch",
];

const ES_READ_WRITE_ACTIONS = [
  ...ES_READ_ACTIONS,
  ...ES_WRITE_ACTIONS,
];

const perms = {
  ES_READ_ACTIONS,
  ES_WRITE_ACTIONS,
  ES_READ_WRITE_ACTIONS,
};

export class Version {
  /** AWS OpenSearch 1.0 */
  public static readonly V1_0 = Version.of("OpenSearch_1.0");

  /**
   * Custom OpenSearch version
   * @param version custom version number
   */
  public static of(version: string): Version {
    return new Version(version);
  }

  /**
   *
   * @param version OpenSearch version number
   */
  private constructor(public readonly version: string) { }
}

export interface DomainProps extends Omit<Elasticsearch.DomainProps, "useUnsignedBasicAuth"> {
  version: Version;
}

/**
 * A new or imported domain.
 */
abstract class DomainBase extends CDK.Resource implements Elasticsearch.IDomain {
  public abstract readonly domainArn: string;

  public abstract readonly domainName: string;

  public abstract readonly domainEndpoint: string;

  /**
   * Grant read permissions for this domain and its contents to an IAM
   * principal (Role/Group/User).
   *
   * @param identity The principal
   */
  public grantRead(identity: IAM.IGrantable): IAM.Grant {
    return this.grant(
      identity,
      perms.ES_READ_ACTIONS,
      this.domainArn,
      `${this.domainArn}/*`,
    );
  }

  /**
   * Grant write permissions for this domain and its contents to an IAM
   * principal (Role/Group/User).
   *
   * @param identity The principal
   */
  public grantWrite(identity: IAM.IGrantable): IAM.Grant {
    return this.grant(
      identity,
      perms.ES_WRITE_ACTIONS,
      this.domainArn,
      `${this.domainArn}/*`,
    );
  }

  /**
   * Grant read/write permissions for this domain and its contents to an IAM
   * principal (Role/Group/User).
   *
   * @param identity The principal
   */
  public grantReadWrite(identity: IAM.IGrantable): IAM.Grant {
    return this.grant(
      identity,
      perms.ES_READ_WRITE_ACTIONS,
      this.domainArn,
      `${this.domainArn}/*`,
    );
  }

  /**
   * Grant read permissions for an index in this domain to an IAM
   * principal (Role/Group/User).
   *
   * @param index The index to grant permissions for
   * @param identity The principal
   */
  public grantIndexRead(index: string, identity: IAM.IGrantable): IAM.Grant {
    return this.grant(
      identity,
      perms.ES_READ_ACTIONS,
      `${this.domainArn}/${index}`,
      `${this.domainArn}/${index}/*`,
    );
  }

  /**
   * Grant write permissions for an index in this domain to an IAM
   * principal (Role/Group/User).
   *
   * @param index The index to grant permissions for
   * @param identity The principal
   */
  public grantIndexWrite(index: string, identity: IAM.IGrantable): IAM.Grant {
    return this.grant(
      identity,
      perms.ES_WRITE_ACTIONS,
      `${this.domainArn}/${index}`,
      `${this.domainArn}/${index}/*`,
    );
  }

  /**
   * Grant read/write permissions for an index in this domain to an IAM
   * principal (Role/Group/User).
   *
   * @param index The index to grant permissions for
   * @param identity The principal
   */
  public grantIndexReadWrite(index: string, identity: IAM.IGrantable): IAM.Grant {
    return this.grant(
      identity,
      perms.ES_READ_WRITE_ACTIONS,
      `${this.domainArn}/${index}`,
      `${this.domainArn}/${index}/*`,
    );
  }

  /**
   * Grant read permissions for a specific path in this domain to an IAM
   * principal (Role/Group/User).
   *
   * @param path The path to grant permissions for
   * @param identity The principal
   */
  public grantPathRead(path: string, identity: IAM.IGrantable): IAM.Grant {
    return this.grant(
      identity,
      perms.ES_READ_ACTIONS,
      `${this.domainArn}/${path}`,
    );
  }

  /**
   * Grant write permissions for a specific path in this domain to an IAM
   * principal (Role/Group/User).
   *
   * @param path The path to grant permissions for
   * @param identity The principal
   */
  public grantPathWrite(path: string, identity: IAM.IGrantable): IAM.Grant {
    return this.grant(
      identity,
      perms.ES_WRITE_ACTIONS,
      `${this.domainArn}/${path}`,
    );
  }

  /**
   * Grant read/write permissions for a specific path in this domain to an IAM
   * principal (Role/Group/User).
   *
   * @param path The path to grant permissions for
   * @param identity The principal
   */
  public grantPathReadWrite(path: string, identity: IAM.IGrantable): IAM.Grant {
    return this.grant(
      identity,
      perms.ES_READ_WRITE_ACTIONS,
      `${this.domainArn}/${path}`,
    );
  }

  /**
   * Return the given named metric for this Domain.
   */
  public metric(metricName: string, props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return new Cloudwatch.Metric({
      namespace: "AWS/ES",
      metricName,
      dimensions: {
        DomainName: this.domainName,
        ClientId: this.stack.account,
      },
      ...props,
    }).attachTo(this);
  }

  /**
   * Metric for the time the cluster status is red.
   *
   * @default maximum over 5 minutes
   */
  public metricClusterStatusRed(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("ClusterStatus.red", {
      statistic: Cloudwatch.Statistic.MAXIMUM,
      ...props,
    });
  }

  /**
   * Metric for the time the cluster status is yellow.
   *
   * @default maximum over 5 minutes
   */
  public metricClusterStatusYellow(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("ClusterStatus.yellow", {
      statistic: Cloudwatch.Statistic.MAXIMUM,
      ...props,
    });
  }

  /**
   * Metric for the storage space of nodes in the cluster.
   *
   * @default minimum over 5 minutes
   */
  public metricFreeStorageSpace(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("FreeStorageSpace", {
      statistic: Cloudwatch.Statistic.MINIMUM,
      ...props,
    });
  }

  /**
   * Metric for the cluster blocking index writes.
   *
   * @default maximum over 1 minute
   */
  public metricClusterIndexWritesBlocked(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("ClusterIndexWritesBlocked", {
      statistic: Cloudwatch.Statistic.MAXIMUM,
      period: CDK.Duration.minutes(1),
      ...props,
    });
  }

  /**
   * Metric for the number of nodes.
   *
   * @default minimum over 1 hour
   */
  public metricNodes(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("Nodes", {
      statistic: Cloudwatch.Statistic.MINIMUM,
      period: CDK.Duration.hours(1),
      ...props,
    });
  }

  /**
   * Metric for automated snapshot failures.
   *
   * @default maximum over 5 minutes
   */
  public metricAutomatedSnapshotFailure(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("AutomatedSnapshotFailure", {
      statistic: Cloudwatch.Statistic.MAXIMUM,
      ...props,
    });
  }

  /**
   * Metric for CPU utilization.
   *
   * @default maximum over 5 minutes
   */
  public metricCPUUtilization(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("CPUUtilization", {
      statistic: Cloudwatch.Statistic.MAXIMUM,
      ...props,
    });
  }

  /**
   * Metric for JVM memory pressure.
   *
   * @default maximum over 5 minutes
   */
  public metricJVMMemoryPressure(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("JVMMemoryPressure", {
      statistic: Cloudwatch.Statistic.MAXIMUM,
      ...props,
    });
  }

  /**
   * Metric for master CPU utilization.
   *
   * @default maximum over 5 minutes
   */
  public metricMasterCPUUtilization(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("MasterCPUUtilization", {
      statistic: Cloudwatch.Statistic.MAXIMUM,
      ...props,
    });
  }

  /**
   * Metric for master JVM memory pressure.
   *
   * @default maximum over 5 minutes
   */
  public metricMasterJVMMemoryPressure(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("MasterJVMMemoryPressure", {
      statistic: Cloudwatch.Statistic.MAXIMUM,
      ...props,
    });
  }

  /**
   * Metric for KMS key errors.
   *
   * @default maximum over 5 minutes
   */
  public metricKMSKeyError(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("KMSKeyError", {
      statistic: Cloudwatch.Statistic.MAXIMUM,
      ...props,
    });
  }

  /**
   * Metric for KMS key being inaccessible.
   *
   * @default maximum over 5 minutes
   */
  public metricKMSKeyInaccessible(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("KMSKeyInaccessible", {
      statistic: Cloudwatch.Statistic.MAXIMUM,
      ...props,
    });
  }

  /**
   * Metric for number of searchable documents.
   *
   * @default maximum over 5 minutes
   */
  public metricSearchableDocuments(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("SearchableDocuments", {
      statistic: Cloudwatch.Statistic.MAXIMUM,
      ...props,
    });
  }

  /**
   * Metric for search latency.
   *
   * @default p99 over 5 minutes
   */
  public metricSearchLatency(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("SearchLatency", { statistic: "p99", ...props });
  }

  /**
   * Metric for indexing latency.
   *
   * @default p99 over 5 minutes
   */
  public metricIndexingLatency(props?: Cloudwatch.MetricOptions): Cloudwatch.Metric {
    return this.metric("IndexingLatency", { statistic: "p99", ...props });
  }

  private grant(
    grantee: IAM.IGrantable,
    domainActions: string[],
    resourceArn: string,
    ...otherResourceArns: string[]
  ): IAM.Grant {
    const resourceArns = [ resourceArn, ...otherResourceArns ];

    const grant = IAM.Grant.addToPrincipal({
      grantee,
      actions: domainActions,
      resourceArns,
      scope: this,
    });

    return grant;
  }
}

/**
 * Provides an OpenSearch domain.
 */
export class Domain extends DomainBase implements Elasticsearch.IDomain, EC2.IConnectable {
  /**
   * Creates a Domain construct that represents an external domain via domain endpoint.
   *
   * @param scope The parent creating construct (usually `this`).
   * @param id The construct's name.
   * @param domainEndpoint The domain's endpoint.
   */
  public static fromDomainEndpoint(
    scope: CDK.Construct,
    id: string,
    domainEndpoint: string,
  ): Elasticsearch.IDomain {
    const stack = CDK.Stack.of(scope);
    const domainName = extractNameFromEndpoint(domainEndpoint);
    const domainArn = stack.formatArn({
      service: "es",
      resource: "domain",
      resourceName: domainName,
    });

    return Domain.fromDomainAttributes(scope, id, {
      domainArn,
      domainEndpoint,
    });
  }

  /**
   * Creates a Domain construct that represents an external domain.
   *
   * @param scope The parent creating construct (usually `this`).
   * @param id The construct's name.
   * @param attrs A `DomainAttributes` object.
   */
  public static fromDomainAttributes(scope: CDK.Construct, id: string, attrs: Elasticsearch.DomainAttributes): Elasticsearch.IDomain {
    const { domainArn, domainEndpoint } = attrs;
    const domainName = CDK.Stack.of(scope).parseArn(domainArn).resourceName ?? extractNameFromEndpoint(domainEndpoint);

    return new class extends DomainBase {
      public readonly domainArn = domainArn;

      public readonly domainName = domainName;

      public readonly domainEndpoint = domainEndpoint;

      constructor() {
        super(scope, id);
      }
    }();
  }

  public readonly domainArn: string;

  public readonly domainName: string;

  public readonly domainEndpoint: string;

  /**
   * Log group that slow searches are logged to.
   *
   * @attribute
   */
  public readonly slowSearchLogGroup?: Logs.ILogGroup;

  /**
   * Log group that slow indices are logged to.
   *
   * @attribute
   */
  public readonly slowIndexLogGroup?: Logs.ILogGroup;

  /**
   * Log group that application logs are logged to.
   *
   * @attribute
   */
  public readonly appLogGroup?: Logs.ILogGroup;

  /**
   * Log group that audit logs are logged to.
   *
   * @attribute
   */
  public readonly auditLogGroup?: Logs.ILogGroup;

  /**
   * Master user password if fine grained access control is configured.
   */
  public readonly masterUserPassword?: CDK.SecretValue;

  private readonly domain: Elasticsearch.CfnDomain;

  private readonly _connections: EC2.Connections | undefined;

  constructor(scope: CDK.Construct, id: string, props: DomainProps) {
    super(scope, id, { physicalName: props.domainName });

    const defaultInstanceType = "t3.small.search";
    const warmDefaultInstanceType = "ultrawarm1.small.search";

    const dedicatedMasterType = props.capacity?.masterNodeInstanceType?.toLowerCase() ?? defaultInstanceType;
    const dedicatedMasterCount = props.capacity?.masterNodes ?? 0;
    const dedicatedMasterEnabled = dedicatedMasterCount > 0;

    const instanceType = props.capacity?.dataNodeInstanceType?.toLowerCase() ?? defaultInstanceType;
    const instanceCount = props.capacity?.dataNodes ?? 1;

    const warmType = props.capacity?.warmInstanceType?.toLowerCase() ?? warmDefaultInstanceType;
    const warmCount = props.capacity?.warmNodes ?? 0;
    const warmEnabled = warmCount > 0;

    const availabilityZoneCount = props.zoneAwareness?.availabilityZoneCount ?? 2;

    if (![ 2, 3 ].includes(availabilityZoneCount)) {
      throw new Error("Invalid zone awareness configuration; availabilityZoneCount must be 2 or 3");
    }

    const zoneAwarenessEnabled = props.zoneAwareness?.enabled
      ?? props.zoneAwareness?.availabilityZoneCount != null;

    let securityGroups: EC2.ISecurityGroup[] | undefined;
    let subnets: EC2.ISubnet[] | undefined;

    if (props.vpc) {
      subnets = selectSubnets(props.vpc, props.vpcSubnets ?? [ { subnetType: EC2.SubnetType.PRIVATE } ]);
      securityGroups = props.securityGroups ?? [ new EC2.SecurityGroup(this, "SecurityGroup", {
        vpc: props.vpc,
        description: `Security group for domain ${this.node.id}`,
      }) ];
      this._connections = new EC2.Connections({ securityGroups });
    }

    // If VPC options are supplied ensure that the number of subnets matches the number AZ
    if (subnets && zoneAwarenessEnabled && new Set(subnets.map((subnet) => subnet.availabilityZone)).size < availabilityZoneCount) {
      throw new Error("When providing vpc options you need to provide a subnet for each AZ you are using");
    }

    if ([ dedicatedMasterType, instanceType, warmType ].some((t) => !t.endsWith(".search"))) {
      throw new Error('Master, data and UltraWarm node instance types must end with ".search".');
    }

    if (!warmType.startsWith("ultrawarm")) {
      throw new Error('UltraWarm node instance type must start with "ultrawarm".');
    }

    const openSearchVersion = props.version.version;

    if (![ Version.V1_0.version ].includes(openSearchVersion)) {
      throw new Error(`Unknown OpenSearch version: ${openSearchVersion}`);
    }

    const masterUserArn = props.fineGrainedAccessControl?.masterUserArn;
    const masterUserNameProps = props.fineGrainedAccessControl?.masterUserName;
    // If basic auth is enabled set the user name to admin if no other user info is supplied.
    const masterUserName = masterUserNameProps;

    if (masterUserArn != null && masterUserName != null) {
      throw new Error("Invalid fine grained access control settings. Only provide one of master user ARN or master user name. Not both.");
    }

    const advancedSecurityEnabled = (masterUserArn ?? masterUserName) != null;
    const internalUserDatabaseEnabled = masterUserName != null;
    const masterUserPasswordProp = props.fineGrainedAccessControl?.masterUserPassword;
    const createMasterUserPassword = (): CDK.SecretValue => new SecretsManager.Secret(this, "MasterUser", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: masterUserName }),
        generateStringKey: "password",
        excludeCharacters: "{}'\\*[]()`",
      },
    }).secretValueFromJson("password");

    this.masterUserPassword = internalUserDatabaseEnabled ? (masterUserPasswordProp ?? createMasterUserPassword()) : undefined;

    const encryptionAtRestEnabled = props.encryptionAtRest?.enabled ?? props.encryptionAtRest?.kmsKey != null;
    const nodeToNodeEncryptionEnabled = props.nodeToNodeEncryption;
    const volumeSize = props.ebs?.volumeSize ?? 10;
    const volumeType = props.ebs?.volumeType ?? EC2.EbsDeviceVolumeType.GENERAL_PURPOSE_SSD;
    const ebsEnabled = props.ebs?.enabled ?? true;
    const { enforceHttps } = props;

    function isInstanceType(t: string): boolean {
      return dedicatedMasterType.startsWith(t) || instanceType.startsWith(t);
    }

    function isSomeInstanceType(...instanceTypes: string[]): boolean {
      return instanceTypes.some(isInstanceType);
    }

    function isEveryInstanceType(...instanceTypes: string[]): boolean {
      return instanceTypes.some((t) => dedicatedMasterType.startsWith(t))
        && instanceTypes.some((t) => instanceType.startsWith(t));
    }

    // Validate against instance type restrictions, per
    // https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/aes-supported-instance-types.html
    if (isSomeInstanceType("i3", "r6gd") && ebsEnabled) {
      throw new Error("I3 and R6GD instance types do not support EBS storage volumes.");
    }

    if (isSomeInstanceType("m3", "r3", "t2") && encryptionAtRestEnabled) {
      throw new Error("M3, R3, and T2 instance types do not support encryption of data at rest.");
    }

    if (props.fineGrainedAccessControl && isInstanceType("t2")) {
      throw new Error("T2 instance types do not support Fine-grained access control");
    }

    if (isSomeInstanceType("t2", "t3")) {
      if (warmEnabled) {
        throw new Error("T2 and T3 instance types do not support UltraWarm storage.");
      }

      if (warmEnabled) {
        throw new Error("T2 and T3 instance types do not support UltraWarm storage.");
      }
    }

    // Only R3, I3 and r6gd support instance storage, per
    // https://aws.amazon.com/elasticsearch-service/pricing/
    if (!ebsEnabled && !isEveryInstanceType("r3", "i3", "r6gd")) {
      throw new Error("EBS volumes are required when using instance types other than r3, i3 or r6gd.");
    }

    if (ebsEnabled && volumeType !== EC2.EbsDeviceVolumeType.GENERAL_PURPOSE_SSD && isInstanceType("t3")) {
      throw new Error("gp2 EBS volume type required when using t3 instance type.");
    }

    // Fine-grained access control requires node-to-node encryption, encryption at rest,
    // and enforced HTTPS.
    if (advancedSecurityEnabled) {
      if (!nodeToNodeEncryptionEnabled) {
        throw new Error("Node-to-node encryption is required when fine-grained access control is enabled.");
      }
      if (!encryptionAtRestEnabled) {
        throw new Error("Encryption-at-rest is required when fine-grained access control is enabled.");
      }
      if (!enforceHttps) {
        throw new Error("Enforce HTTPS is required when fine-grained access control is enabled.");
      }
    }

    // Validate fine grained access control enabled for audit logs, per
    // https://aws.amazon.com/about-aws/whats-new/2020/09/elasticsearch-audit-logs-now-available-on-amazon-elasticsearch-service/
    if (props.logging?.auditLogEnabled && !advancedSecurityEnabled) {
      throw new Error("Fine-grained access control is required when audit logs publishing is enabled.");
    }

    // Validate UltraWarm requirement for dedicated master nodes, per
    // https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/ultrawarm.html
    if (warmEnabled && !dedicatedMasterEnabled) {
      throw new Error("Dedicated master node is required when UltraWarm storage is enabled.");
    }

    let cfnVpcOptions: Elasticsearch.CfnDomain.VPCOptionsProperty | undefined;

    if (securityGroups && subnets) {
      cfnVpcOptions = {
        securityGroupIds: securityGroups.map((sg) => sg.securityGroupId),
        subnetIds: subnets.map((subnet) => subnet.subnetId),
      };
    }

    // Setup logging
    const logGroups: Logs.ILogGroup[] = [];

    if (props.logging?.slowSearchLogEnabled) {
      this.slowSearchLogGroup = props.logging.slowSearchLogGroup
        ?? new Logs.LogGroup(this, "SlowSearchLogs", { retention: Logs.RetentionDays.ONE_MONTH });

      logGroups.push(this.slowSearchLogGroup);
    }

    if (props.logging?.slowIndexLogEnabled) {
      this.slowIndexLogGroup = props.logging.slowIndexLogGroup
        ?? new Logs.LogGroup(this, "SlowIndexLogs", { retention: Logs.RetentionDays.ONE_MONTH });

      logGroups.push(this.slowIndexLogGroup);
    }

    if (props.logging?.appLogEnabled) {
      this.appLogGroup = props.logging.appLogGroup
        ?? new Logs.LogGroup(this, "AppLogs", { retention: Logs.RetentionDays.ONE_MONTH });

      logGroups.push(this.appLogGroup);
    }

    if (props.logging?.auditLogEnabled) {
      this.auditLogGroup = props.logging.auditLogGroup
          ?? new Logs.LogGroup(this, "AuditLogs", { retention: Logs.RetentionDays.ONE_MONTH });

      logGroups.push(this.auditLogGroup);
    }

    let logGroupResourcePolicy: LogGroupResourcePolicy | null = null;
    if (logGroups.length > 0) {
      const logPolicyStatement = new IAM.PolicyStatement({
        effect: IAM.Effect.ALLOW,
        actions: [ "logs:PutLogEvents", "logs:CreateLogStream" ],
        resources: logGroups.map((lg) => lg.logGroupArn),
        principals: [ new IAM.ServicePrincipal("es.amazonaws.com") ],
      });

      // Use a custom resource to set the log group resource policy since it is not supported by CDK and cfn.
      // https://github.com/aws/aws-cdk/issues/5343
      logGroupResourcePolicy = new LogGroupResourcePolicy(this, `ESLogGroupPolicy${this.node.addr}`, {
        // create a cloudwatch logs resource policy name that is unique to this domain instance
        policyName: `ESLogPolicy${this.node.addr}`,
        policyStatements: [ logPolicyStatement ],
      });
    }

    const logPublishing: Record<string, any> = {};

    if (this.appLogGroup) {
      logPublishing.ES_APPLICATION_LOGS = {
        enabled: true,
        cloudWatchLogsLogGroupArn: this.appLogGroup.logGroupArn,
      };
    }

    if (this.slowSearchLogGroup) {
      logPublishing.SEARCH_SLOW_LOGS = {
        enabled: true,
        cloudWatchLogsLogGroupArn: this.slowSearchLogGroup.logGroupArn,
      };
    }

    if (this.slowIndexLogGroup) {
      logPublishing.INDEX_SLOW_LOGS = {
        enabled: true,
        cloudWatchLogsLogGroupArn: this.slowIndexLogGroup.logGroupArn,
      };
    }

    if (this.auditLogGroup) {
      logPublishing.AUDIT_LOGS = {
        enabled: this.auditLogGroup != null,
        cloudWatchLogsLogGroupArn: this.auditLogGroup?.logGroupArn,
      };
    }

    let customEndpointCertificate: ACM.ICertificate | undefined;
    if (props.customEndpoint) {
      if (props.customEndpoint.certificate) {
        customEndpointCertificate = props.customEndpoint.certificate;
      } else {
        customEndpointCertificate = new ACM.Certificate(this, "CustomEndpointCertificate", {
          domainName: props.customEndpoint.domainName,
          validation: props.customEndpoint.hostedZone ? ACM.CertificateValidation.fromDns(props.customEndpoint.hostedZone) : undefined,
        });
      }
    }

    // Create the domain
    this.domain = new Elasticsearch.CfnDomain(this, "Resource", {
      domainName: this.physicalName,
      elasticsearchVersion: openSearchVersion,
      elasticsearchClusterConfig: {
        dedicatedMasterEnabled,
        dedicatedMasterCount: dedicatedMasterEnabled ? dedicatedMasterCount : undefined,
        dedicatedMasterType: dedicatedMasterEnabled ? dedicatedMasterType.replace(".search", ".elasticsearch") : undefined,
        instanceCount,
        instanceType: instanceType.replace(".search", ".elasticsearch"),
        warmEnabled: warmEnabled || undefined,
        warmCount: warmEnabled ? warmCount : undefined,
        warmType: warmEnabled ? warmType.replace(".search", ".elasticsearch") : undefined,
        zoneAwarenessEnabled,
        zoneAwarenessConfig: zoneAwarenessEnabled ? { availabilityZoneCount } : undefined,
      },
      ebsOptions: {
        ebsEnabled,
        volumeSize: ebsEnabled ? volumeSize : undefined,
        volumeType: ebsEnabled ? volumeType : undefined,
        iops: ebsEnabled ? props.ebs?.iops : undefined,
      },
      encryptionAtRestOptions: {
        enabled: encryptionAtRestEnabled,
        kmsKeyId: encryptionAtRestEnabled ? props.encryptionAtRest?.kmsKey?.keyId : undefined,
      },
      nodeToNodeEncryptionOptions: { enabled: nodeToNodeEncryptionEnabled },
      logPublishingOptions: logPublishing,
      cognitoOptions: {
        enabled: props.cognitoKibanaAuth != null,
        identityPoolId: props.cognitoKibanaAuth?.identityPoolId,
        roleArn: props.cognitoKibanaAuth?.role.roleArn,
        userPoolId: props.cognitoKibanaAuth?.userPoolId,
      },
      vpcOptions: cfnVpcOptions,
      snapshotOptions: props.automatedSnapshotStartHour ? { automatedSnapshotStartHour: props.automatedSnapshotStartHour } : undefined,
      domainEndpointOptions: {
        enforceHttps,
        tlsSecurityPolicy: props.tlsSecurityPolicy ?? Elasticsearch.TLSSecurityPolicy.TLS_1_0,
        ...props.customEndpoint && {
          customEndpointEnabled: true,
          customEndpoint: props.customEndpoint.domainName,
          customEndpointCertificateArn: customEndpointCertificate!.certificateArn,
        },
      },
      advancedSecurityOptions: advancedSecurityEnabled ? {
        enabled: true,
        internalUserDatabaseEnabled,
        masterUserOptions: {
          masterUserArn,
          masterUserName,
          masterUserPassword: this.masterUserPassword?.toString(),
        },
      } : undefined,
      advancedOptions: props.advancedOptions,
    });

    this.domain.applyRemovalPolicy(props.removalPolicy);

    if (props.enableVersionUpgrade) {
      this.domain.cfnOptions.updatePolicy = {
        ...this.domain.cfnOptions.updatePolicy,
        enableVersionUpgrade: props.enableVersionUpgrade,
      };
    }

    if (logGroupResourcePolicy) {
      this.domain.node.addDependency(logGroupResourcePolicy);
    }

    if (props.domainName) {
      this.node.addMetadata("aws:cdk:hasPhysicalName", props.domainName);
    }

    this.domainName = this.getResourceNameAttribute(this.domain.ref);

    this.domainEndpoint = this.domain.getAtt("DomainEndpoint").toString();

    this.domainArn = this.getResourceArnAttribute(this.domain.attrArn, {
      service: "es",
      resource: "domain",
      resourceName: this.physicalName,
    });

    if (props.customEndpoint?.hostedZone) {
      new Route53.CnameRecord(this, "CnameRecord", {
        recordName: props.customEndpoint.domainName,
        zone: props.customEndpoint.hostedZone,
        domainName: this.domainEndpoint,
      });
    }

    const accessPolicyStatements: IAM.PolicyStatement[] | undefined = props.accessPolicies;

    if (accessPolicyStatements != null) {
      const accessPolicy = new ElasticsearchAccessPolicy(this, "ESAccessPolicy", {
        domainName: this.domainName,
        domainArn: this.domainArn,
        accessPolicies: accessPolicyStatements,
      });

      if (props.encryptionAtRest?.kmsKey) {
        // https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/encryption-at-rest.html

        // these permissions are documented as required during domain creation.
        // while not strictly documented for updates as well, it stands to reason that an update
        // operation might require these in case the cluster uses a kms key.
        // empircal evidence shows this is indeed required: https://github.com/aws/aws-cdk/issues/11412
        accessPolicy.grantPrincipal.addToPrincipalPolicy(new IAM.PolicyStatement({
          actions: [ "kms:List*", "kms:Describe*", "kms:CreateGrant" ],
          resources: [ props.encryptionAtRest.kmsKey.keyArn ],
          effect: IAM.Effect.ALLOW,
        }));
      }

      accessPolicy.node.addDependency(this.domain);
    }
  }

  /**
   * Manages network connections to the domain. This will throw an error in case the domain
   * is not placed inside a VPC.
   */
  public get connections(): EC2.Connections {
    if (!this._connections) {
      throw new Error("Connections are only available on VPC enabled domains. Use the 'vpc' property to place a domain inside a VPC");
    }
    return this._connections;
  }
}

/**
 * Given an Elasticsearch domain endpoint, returns a CloudFormation expression that
 * extracts the domain name.
 *
 * Domain endpoints look like this:
 *
 *   https://example-domain-jcjotrt6f7otem4sqcwbch3c4u.us-east-1.es.amazonaws.com
 *   https://<domain-name>-<suffix>.<region>.es.amazonaws.com
 *
 * ..which means that in order to extract the domain name from the endpoint, we can
 * split the endpoint using "-<suffix>" and select the component in index 0.
 *
 * @param domainEndpoint The Elasticsearch domain endpoint
 */
function extractNameFromEndpoint(domainEndpoint: string) {
  const { hostname } = new URL(domainEndpoint);
  const domain = hostname.split(".")[0];
  const suffix = `-${domain.split("-").slice(-1)[0]}`;
  return domain.split(suffix)[0];
}

function selectSubnets(vpc: EC2.IVpc, vpcSubnets: EC2.SubnetSelection[]): EC2.ISubnet[] {
  const selected = [];
  for (const selection of vpcSubnets) {
    selected.push(...vpc.selectSubnets(selection).subnets);
  }
  return selected;
}
