import "reflect-metadata";
import { injectable, inject } from "inversify";
import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "../services/logger.service";
import { Unmarshall, UnmarshallFactory } from "../factories/unmarshall.factory";
import { ProcessorServiceInterface, ProcessorServiceRecord } from "../services/interfaces/processor.service.interface";
import { EnvConfigInterface } from "../config/envConfig";

@injectable()
export class DynamoStreamController implements DynamoStreamControllerInterface {
  private unmarshall: Unmarshall;

  private tableNames: string[];

  constructor(
  @inject(TYPES.EnvConfigInterface) envConfig: DynamoStreamControllerConfigInterface,
    @inject(TYPES.UnmarshallFactory) unmarshallFactory: UnmarshallFactory,
    @inject(TYPES.ProcessorServicesInterface) private processorServices: ProcessorServiceInterface[],
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {
    this.tableNames = envConfig.tableNames;
    this.unmarshall = unmarshallFactory();
  }

  public async handleStreamEvent(event: DynamoDBStreamEvent): Promise<void> {
    try {
      this.loggerService.trace("handleStreamEvent called", { event }, this.constructor.name);

      const preparedRecords = event.Records.map((record) => this.prepareRecordsForProcessorServices(record));

      await Promise.allSettled(preparedRecords.map((record) => this.callSupportingProcessorServices(record)));
    } catch (error: unknown) {
      this.loggerService.error("Error in handleStreamEvent", { error, event }, this.constructor.name);

      throw error;
    }
  }

  private async callSupportingProcessorServices(record: ProcessorServiceRecord): Promise<void> {
    try {
      this.loggerService.trace("callSupportingProcessorServices called", { record }, this.constructor.name);

      const supportingProcessorServices = this.processorServices.filter((processorService) => processorService.determineRecordSupport(record));

<<<<<<< HEAD
      const processRecordResults = await Promise.allSettled(supportingProcessorServices.map((processorService) => processorService.processRecord(record)));
=======
      const processRecordResults = await Promise.allSettled(
        supportingProcessorServices.map((processorService) => processorService.processRecord(record)),
      );
>>>>>>> master

      const failures = processRecordResults.filter((result) => result.status === "rejected") as PromiseRejectedResult[];

      if (failures.length) {
        const errors = failures.map((failure) => failure.reason as unknown);

        this.loggerService.error(`Error calling ${failures.length} of ${this.processorServices.length} processor services.`, { errors, record }, this.constructor.name);
      }
    } catch (error: unknown) {
      this.loggerService.error("Error in callSupportingProcessorServices", { error, record }, this.constructor.name);

      throw error;
    }
  }

  private prepareRecordsForProcessorServices(record: DynamoDBRecord): ProcessorServiceRecord {
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

      throw error;
    }
  }
}

<<<<<<< HEAD
export type DynamoStreamControllerConfigInterface = Pick<EnvConfigInterface, "tableNames">;
=======
export type DynamoStreamControllerConfigInterface = Pick<EnvConfigInterface, "groupsTableName">;
>>>>>>> master

export interface DynamoStreamControllerInterface {
  handleStreamEvent(event: DynamoDBStreamEvent): Promise<void>;
}
