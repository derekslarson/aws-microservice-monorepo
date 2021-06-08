export type DynamoProcessorServiceRecord<T extends Record<string, unknown> = Record<string, unknown>> = {
  tableName: string;
  eventName: "INSERT" | "MODIFY" | "REMOVE" | "UNKNOWN";
  newImage: T;
  oldImage: T;
};

export interface DynamoProcessorServiceInterface {
  determineRecordSupport(record: DynamoProcessorServiceRecord): boolean;
  processRecord(record: DynamoProcessorServiceRecord): Promise<void>;
}
