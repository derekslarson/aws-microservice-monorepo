export interface SnsProcessorServiceRecord<T extends Record<string, unknown> = Record<string, unknown>> {
  topicArn: string;
  message: T;
}

export interface SnsProcessorServiceInterface {
  determineRecordSupport(record: SnsProcessorServiceRecord): boolean;
  processRecord(record: SnsProcessorServiceRecord): Promise<void>;
}
