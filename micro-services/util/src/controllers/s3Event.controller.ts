import "reflect-metadata";
import { injectable, inject } from "inversify";
import { S3Event, S3EventRecord } from "aws-lambda";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "../services/logger.service";
import { S3ProcessorServiceInterface, S3ProcessorServiceRecord } from "../services/interfaces/s3.processor.service.interface";

@injectable()
export class S3EventController implements S3EventControllerInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.S3ProcessorServicesInterface) private processorServices: S3ProcessorServiceInterface[],
  ) {
  }

  public async handleS3Event(event: S3Event): Promise<void> {
    try {
      this.loggerService.trace("handleS3Event called", { event }, this.constructor.name);

      const preparedRecords = event.Records.map((record) => this.prepareRecordsForProcessorServices(record));

      await Promise.allSettled(preparedRecords.map((record) => this.callSupportingProcessorServices(record)));
    } catch (error: unknown) {
      // Shouldn't be able to get here
      this.loggerService.error("Error in handleS3Event", { error, event }, this.constructor.name);
    }
  }

  private async callSupportingProcessorServices(record: S3ProcessorServiceRecord): Promise<void> {
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

  private prepareRecordsForProcessorServices(record: S3EventRecord): S3ProcessorServiceRecord {
    try {
      this.loggerService.trace("prepareRecordsForProcessorServices called", { record }, this.constructor.name);

      const { object, bucket } = record.s3;

      return {
        bucketName: bucket.name,
        key: object.key,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in prepareRecordsForProcessorServices", { error, record }, this.constructor.name);

      return {
        bucketName: "",
        key: "",
      };
    }
  }
}

export interface S3EventControllerInterface {
  handleS3Event(event: S3Event): Promise<void>;
}
