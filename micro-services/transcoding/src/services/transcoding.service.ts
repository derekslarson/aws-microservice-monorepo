import { inject, injectable } from "inversify";
import { MessageTranscodedSnsMessage, MessageFileRepositoryInterface, HttpRequestServiceInterface, LoggerServiceInterface, MessageMimeType } from "@yac/util";
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

      const fileDetails = await this.rawMessageFileRepository.messageHeadObjectByKey({ key });
      const isVideo = fileDetails.ContentType?.toLowerCase().includes("video");
      const keyWithoutExtension = key.slice(0, key.lastIndexOf("."));
      const outputExtension = isVideo ? "mp4" : "mp3";
      const outputKey = `${keyWithoutExtension}.${outputExtension}`;
      const outputMimeType = isVideo ? MessageMimeType.VideoMp4 : MessageMimeType.AudioMp3;

      const { signedUrl: inputUrl } = this.rawMessageFileRepository.getMessageSignedUrlByKey({ operation: "get", key });

      const { signedUrl: outputUrl } = this.enhancedMessageFileRepository.getMessageSignedUrlByKey({ operation: "upload", key: outputKey, mimeType: outputMimeType });

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

      const fileDetails = await this.enhancedMessageFileRepository.messageHeadObjectByKey({ key });
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
