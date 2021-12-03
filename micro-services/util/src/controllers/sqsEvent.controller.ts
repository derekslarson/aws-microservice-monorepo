import "reflect-metadata";
import { injectable, inject } from "inversify";
import { SNSMessage, SQSEvent, SQSRecord } from "aws-lambda";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "../services/logger.service";
import { SnsProcessorServiceInterface, SnsProcessorServiceRecord } from "../services/interfaces/sns.processor.service.interface";

@injectable()
export class SqsEventController implements SqsEventControllerInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.SnsProcessorServicesInterface) private processorServices: SnsProcessorServiceInterface[],
  ) {
  }

  public async handleSqsEvent(event: SQSEvent): Promise<void> {
    try {
      this.loggerService.trace("handleSqsEvent called", { event }, this.constructor.name);

      const preparedRecords = event.Records.map((record) => this.prepareRecordsForProcessorServices(record));

      await Promise.all(preparedRecords.map((record) => this.callSupportingProcessorServices(record)));
    } catch (error: unknown) {
      // Shouldn't be able to get here
      this.loggerService.error("Error in handleSqsEvent", { error, event }, this.constructor.name);
    }
  }

  private async callSupportingProcessorServices(record: SnsProcessorServiceRecord): Promise<void> {
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

  private prepareRecordsForProcessorServices(record: SQSRecord): SnsProcessorServiceRecord {
    try {
      this.loggerService.trace("prepareRecordsForProcessorServices called", { record }, this.constructor.name);

      const snsMessage = JSON.parse(record.body) as SNSMessage;

      const { TopicArn, Message } = snsMessage;

      return {
        topicArn: TopicArn,
        message: JSON.parse(Message) as Record<string, unknown>,
      };
    } catch (error: unknown) {
      this.loggerService.error("Error in prepareRecordsForProcessorServices", { error, record }, this.constructor.name);

      return {
        topicArn: "",
        message: {},
      };
    }
  }
}

export interface SqsEventControllerInterface {
  handleSqsEvent(event: SQSEvent): Promise<void>;
}
