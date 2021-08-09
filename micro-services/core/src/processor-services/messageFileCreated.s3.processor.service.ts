import "reflect-metadata";
import { injectable, inject } from "inversify";
import { LoggerServiceInterface, S3ProcessorServiceInterface, S3ProcessorServiceRecord } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { MessageMediatorServiceInterface } from "../mediator-services/message.mediator.service";
import { KeyPrefix } from "../enums/keyPrefix.enum";
import { PendingMessageId } from "../types/pendingMessageId.type";

@injectable()
export class MessageFileCreatedS3ProcessorService implements S3ProcessorServiceInterface {
  private messageS3BucketName: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageMediatorServiceInterface) private messageMediatorService: MessageMediatorServiceInterface,
    @inject(TYPES.EnvConfigInterface) config: MessageFileCreatedS3ProcessorServiceConfig,
  ) {
    this.messageS3BucketName = config.bucketNames.message;
  }

  public determineRecordSupport(record: S3ProcessorServiceRecord): boolean {
    try {
      this.loggerService.trace("determineRecordSupport called", { record }, this.constructor.name);

      return record.bucketName === this.messageS3BucketName;
    } catch (error: unknown) {
      this.loggerService.error("Error in determineRecordSupport", { error, record }, this.constructor.name);

      throw error;
    }
  }

  public async processRecord(record: S3ProcessorServiceRecord): Promise<void> {
    try {
      this.loggerService.trace("processRecord called", { record }, this.constructor.name);

      const { key } = record;

      const [ , messageIdWithExtension ] = key.split("/");
      const [ messageId ] = messageIdWithExtension.split(".");
      const pendingMessageId = messageId.replace(KeyPrefix.Message, KeyPrefix.PendingMessage) as PendingMessageId;

      await this.messageMediatorService.convertPendingToRegularMessage({ pendingMessageId });
    } catch (error: unknown) {
      this.loggerService.error("Error in processRecord", { error, record }, this.constructor.name);

      throw error;
    }
  }
}

export type MessageFileCreatedS3ProcessorServiceConfig = Pick<EnvConfigInterface, "bucketNames">;
