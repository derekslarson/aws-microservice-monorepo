import { S3EventRecord } from "aws-lambda/trigger/s3";

export function generateMockS3EventRecord(objectKey = "mock-object-key", bucketName = "mock-bucket-name"): S3EventRecord {
  return {
    eventVersion: "mock-event-version",
    eventSource: "mock-event-source",
    awsRegion: "mock-aws-region",
    eventTime: "mock-event-time",
    eventName: "mock-event-name",
    userIdentity: { principalId: "mock-user-principal-id" },
    requestParameters: { sourceIPAddress: "mock-source-ip-address" },
    responseElements: {
      "x-amz-request-id": "mock-amz-request-id",
      "x-amz-id-2": "mock-amz-id-2",
    },
    s3: {
      s3SchemaVersion: "mock-s3-schema-version",
      configurationId: "mock-configuration-id",
      bucket: {
        name: bucketName,
        ownerIdentity: { principalId: "mock-owner-principal-id" },
        arn: "mock-bucket-arn",
      },
      object: {
        key: objectKey,
        size: 1,
        eTag: "mock-e-tag",
        versionId: "mock-version-id",
        sequencer: "mock-sequencer",
      },
    },
    glacierEventData: {
      restoreEventData: {
        lifecycleRestorationExpiryTime: "mock-lifecycle-restoration-expiry-time",
        lifecycleRestoreStorageClass: "lifecycle-restore-storage-class",
      },
    },
  };
}
