import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "../services/logger.service";
import { Unmarshall, UnmarshallFactory } from "../factories/unmarshall.factory";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "../services/interfaces/dynamo.processor.service.interface";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class DynamoStreamController implements DynamoStreamControllerInterface {
  private unmarshall: Unmarshall;

  private tableNames: string[];

  constructor(
  @inject(TYPES.EnvConfigInterface) envConfig: DynamoStreamControllerConfigInterface,
    @inject(TYPES.DynamoProcessorServicesInterface) private processorServices: DynamoProcessorServiceInterface[],
    @inject(TYPES.UnmarshallFactory) unmarshallFactory: UnmarshallFactory,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {
    this.tableNames = Object.values(envConfig.tableNames);
    this.unmarshall = unmarshallFactory();
  }

  public async handleStreamEvent(event: DynamoDBStreamEvent): Promise<void> {
    try {
      this.loggerService.trace("handleStreamEvent called", { event }, this.constructor.name);

      const preparedRecords = event.Records.map((record) => this.prepareRecordsForProcessorServices(record));

      await Promise.allSettled(preparedRecords.map((record) => this.callSupportingProcessorServices(record)));
    } catch (error: unknown) {
      // Shouldn't be able to get here
      this.loggerService.error("Error in handleStreamEvent", { error, event }, this.constructor.name);
    }
  }

  private async callSupportingProcessorServices(record: DynamoProcessorServiceRecord): Promise<void> {
    try {
      this.loggerService.trace("callSupportingProcessorServices called", { record }, this.constructor.name);

      const supportingProcessorServices = this.processorServices.filter((processorService) => processorService.determineRecordSupport(record));

      const processRecordResults = await Promise.allSettled(supportingProcessorServices.map((processorService) => processorService.processRecord(record)));

      const failures = processRecordResults.filter((result) => result.status === "rejected") as PromiseRejectedResult[];

      if (failures.length) {
        const errors = failures.map((failure) => failure.reason as unknown);

        this.loggerService.error(`Error calling ${failures.length} of ${this.processorServices.length} processor services.`, { errors, record }, this.constructor.name);
      }
    } catch (error: unknown) {
      // Shouldn't be able to get here
      this.loggerService.error("Error in callSupportingProcessorServices", { error, record }, this.constructor.name);
    }
  }

  private prepareRecordsForProcessorServices(record: DynamoDBRecord): DynamoProcessorServiceRecord {
    try {
      this.loggerService.trace("prepareRecordsForProcessorServices called", { record }, this.constructor.name);

      const { eventSourceARN, eventName, dynamodb } = record;

      const tableName = this.tableNames.find((name) => eventSourceARN?.includes(`/${name}/`));

      const newImage = dynamodb?.NewImage && this.unmarshall(dynamodb?.NewImage);
      const oldImage = dynamodb?.OldImage && this.unmarshall(dynamodb?.OldImage);

      return {
        tableName: tableName || "",
        eventName: eventName || "UNKNOWN",
        newImage: newImage || {},
        oldImage: oldImage || {},
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in prepareRecordsForProcessorServices", { error, record }, this.constructor.name);

      return {
        tableName: "",
        eventName: "UNKNOWN",
        newImage: {},
        oldImage: {},
      };
    }
  }
}

export type DynamoStreamControllerConfigInterface = Pick<EnvConfigInterface, "tableNames">;

export interface DynamoStreamControllerInterface {
  handleStreamEvent(event: DynamoDBStreamEvent): Promise<void>;
}
