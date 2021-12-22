import { inject, injectable } from "inversify";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { HttpRequestServiceInterface } from "@yac/util/src/services/http.request.service";
import { MessageFileRepositoryInterface } from "@yac/util/src/repositories/base.message.s3.repository";
import { MessageMimeType } from "@yac/util/src/enums/message.mimeType.enum";
import { FileOperation } from "@yac/util/src/enums/fileOperation.enum";
import { MessageTranscodedSnsMessage } from "@yac/util/src/api-contracts/sns-topics/messageTranscoded.snsMessage.model";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { MessageTranscodedSnsServiceInterface } from "../sns-services/messageTranscoded.sns.service";

@injectable()
export class TranscodingService implements TranscodingServiceInterface {
  private audoAiApiDomain: string;

  private audoAiApiKey: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.HttpRequestServiceInterface) private httpRequestService: HttpRequestServiceInterface,
    @inject(TYPES.MessageTranscodedSnsServiceInterface) private messageTranscodedSnsService: MessageTranscodedSnsServiceInterface,
    @inject(TYPES.RawMessageFileRepositoryInterface) private rawMessageFileRepository: MessageFileRepositoryInterface,
    @inject(TYPES.EnhancedMessageFileRepositoryInterface) private enhancedMessageFileRepository: MessageFileRepositoryInterface,
    @inject(TYPES.EnvConfigInterface) config: MessageFileCreatedS3ProcessorServiceConfig,
  ) {
    this.audoAiApiKey = config.audoAiApiKey;
    this.audoAiApiDomain = config.audoAiApiDomain;
  }

  public async startTranscodingJob(params: StartTranscodingJobInput): Promise<StartTranscodingJobOutput> {
    try {
      this.loggerService.trace("startTranscodingJob called", { params }, this.constructor.name);

      const { key } = params;

      const fileDetails = await this.rawMessageFileRepository.headObject({ key });
      const isVideo = fileDetails.ContentType?.toLowerCase().includes("video");
      const keyWithoutExtension = key.slice(0, key.lastIndexOf("."));
      const outputExtension = isVideo ? "mp4" : "mp3";
      const outputKey = `${keyWithoutExtension}.${outputExtension}`;
      const outputMimeType = isVideo ? MessageMimeType.VideoMp4 : MessageMimeType.AudioMp3;

      const { signedUrl: inputUrl } = this.rawMessageFileRepository.getSignedUrl({ operation: FileOperation.Get, key });

      const { signedUrl: outputUrl } = this.enhancedMessageFileRepository.getSignedUrl({ operation: FileOperation.Upload, key: outputKey, mimeType: outputMimeType });

      const body = {
        input: inputUrl,
        output: outputUrl,
        outputExtension,
      };

      const headers = { "x-api-key": this.audoAiApiKey };

      await this.httpRequestService.post(`${this.audoAiApiDomain}/v1/remove-noise`, body, {}, headers);
    } catch (error: unknown) {
      this.loggerService.error("Error in startTranscodingJob", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async transcodingJobComplete(params: TranscodingJobCompleteInput): Promise<TranscodingJobCompleteOutput> {
    try {
      this.loggerService.trace("transcodingJobComplete called", { params }, this.constructor.name);

      const { key } = params;

      const fileDetails = await this.enhancedMessageFileRepository.headObject({ key });
      const isVideo = fileDetails.ContentType?.toLowerCase().includes("video");
      const messageId = key.slice(key.lastIndexOf("/") + 1, key.lastIndexOf(".")) as MessageTranscodedSnsMessage["messageId"];

      const newMimeType = isVideo ? MessageMimeType.VideoMp4 : MessageMimeType.AudioMp3;

      await this.messageTranscodedSnsService.sendMessage({ key, messageId, newMimeType });
    } catch (error: unknown) {
      this.loggerService.error("Error in transcodingJobComplete", { error, params }, this.constructor.name);

      throw error;
    }
  }
}

export interface TranscodingServiceInterface {
  startTranscodingJob(params: StartTranscodingJobInput): Promise<StartTranscodingJobOutput>;
  transcodingJobComplete(params: TranscodingJobCompleteInput): Promise<TranscodingJobCompleteOutput>;
}

export interface StartTranscodingJobInput {
  key: string;
}

export type StartTranscodingJobOutput = void;

export interface TranscodingJobCompleteInput {
  key: string;
}

export type TranscodingJobCompleteOutput = void;

export type MessageFileCreatedS3ProcessorServiceConfig = Pick<EnvConfigInterface, "audoAiApiKey" | "audoAiApiDomain">;
