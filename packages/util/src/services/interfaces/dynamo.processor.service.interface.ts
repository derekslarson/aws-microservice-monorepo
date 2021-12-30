import { RawEntity } from "../../types/raw.entity.type";

export type DynamoProcessorServiceRecord<T extends Partial<RawEntity> = Partial<RawEntity>> = {
  tableName: string;
  eventName: "INSERT" | "MODIFY" | "REMOVE" | "UNKNOWN";
  newImage: T;
  oldImage: T;
};

export interface DynamoProcessorServiceInterface {
  determineRecordSupport(record: DynamoProcessorServiceRecord): boolean;
  processRecord(record: DynamoProcessorServiceRecord): Promise<void>;
}
