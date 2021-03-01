export type ProcessorServiceRecord = {
  tableName: string;
  eventName: "INSERT" | "MODIFY" | "REMOVE" | "UNKNOWN";
  newImage: Record<string, unknown>;
  oldImage: Record<string, unknown>;
};

export interface ProcessorServiceInterface {
  determineRecordSupport(record: ProcessorServiceRecord): boolean;
  processRecord(record: ProcessorServiceRecord): Promise<void>;
}
