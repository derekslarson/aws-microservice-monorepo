export interface S3ProcessorServiceRecord {
  bucketName: string;
  key: string;
}

export interface S3ProcessorServiceInterface {
  determineRecordSupport(record: S3ProcessorServiceRecord): boolean;
  processRecord(record: S3ProcessorServiceRecord): Promise<void>;
}
