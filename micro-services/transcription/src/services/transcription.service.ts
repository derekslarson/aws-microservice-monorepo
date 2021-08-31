import { inject, injectable } from "inversify";
import { MessageTranscodedSnsMessage, LoggerServiceInterface, NotFoundError } from "@yac/util";
import { TYPES } from "../inversion-of-control/types";
import { MessageTranscribedSnsServiceInterface } from "../sns-services/messageTranscribed.sns.service";
import { Transcribe, TranscribeFactory } from "../factories/transcribe.factory";
import { EnvConfigInterface } from "../config/env.config";
import { TranscriptionFileRepositoryInterface } from "../repositories/transcriptionFile.repository";

@injectable()
export class TranscriptionService implements TranscriptionServiceInterface {
  private transcribe: Transcribe;

  private messageBucketName: string;

  private transcriptionBucketName: string;

  private environment: string;

  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MessageTranscribedSnsServiceInterface) private messageTranscribedSnsService: MessageTranscribedSnsServiceInterface,
    @inject(TYPES.TranscriptionFileRepositoryInterface) private transcriptionFileRepository: TranscriptionFileRepositoryInterface,
    @inject(TYPES.EnvConfigInterface) config: TranscriptionServiceConfig,
    @inject(TYPES.TranscribeFactory) transcribeFactory: TranscribeFactory,
  ) {
    this.transcribe = transcribeFactory();
    this.messageBucketName = config.bucketNames.message;
    this.transcriptionBucketName = config.bucketNames.transcription;
    this.environment = config.environment;
  }

  public async startTranscriptionJob(params: StartTranscriptionJobInput): Promise<StartTranscriptionJobOutput> {
    try {
      this.loggerService.trace("startTranscriptionJob called", { params }, this.constructor.name);

      const { messageId, messageFileKey } = params;

      const transcriptionJobName = `${this.environment}_${messageId}`;
      const mediaFileUri = `s3://${this.messageBucketName}/${messageFileKey}`;

      await this.transcribe.startTranscriptionJob({
        TranscriptionJobName: transcriptionJobName,
        Media: { MediaFileUri: mediaFileUri },
        OutputBucketName: this.transcriptionBucketName,
        IdentifyLanguage: true,
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in startTranscriptionJob", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async transcriptionJobCompleted(params: TranscriptionJobCompletedInput): Promise<TranscriptionJobCompletedOutput> {
    try {
      this.loggerService.trace("transcriptionJobCompleted called", { params }, this.constructor.name);

      const { transcriptionJobName } = params;

      const transcriptionFileKey = `${transcriptionJobName}.json`;

      const { Body } = await this.transcriptionFileRepository.getObject({ key: transcriptionFileKey });

      if (!Body) {
        throw new NotFoundError("Transcription file not found");
      }

      const transcriptionData = JSON.parse(Body as string) as TranscriptionData;

      const transcript = transcriptionData.results.transcripts[0] ? transcriptionData.results.transcripts[0].transcript : "";

      const { transcript: transcriptWithReplacements } = this.replaceUnwantedWords({ transcript });

      const { transcript: transcriptWithBreaks } = this.addSentenceBreaks({ transcript: transcriptWithReplacements });

      const messageId = transcriptionJobName.replace(`${this.environment}_`, "") as MessageTranscodedSnsMessage["messageId"];

      await this.messageTranscribedSnsService.sendMessage({ messageId, transcript: transcriptWithBreaks });
    } catch (error: unknown) {
      this.loggerService.error("Error in transcriptionJobCompleted", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async transcriptionJobFailed(params: TranscriptionJobFailedInput): Promise<TranscriptionJobFailedOutput> {
    try {
      this.loggerService.trace("transcriptionJobFailed called", { params }, this.constructor.name);

      // TODO: Add error handling
      await Promise.resolve();
    } catch (error: unknown) {
      this.loggerService.error("Error in transcriptionJobFailed", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private replaceUnwantedWords(params: ReplaceUnwantedWordsInput): ReplaceUnwantedWordsOutput {
    try {
      this.loggerService.trace("replaceUnwantedWords called", { params }, this.constructor.name);

      const { transcript } = params;

      const transcriptWithReplacements = transcript
        .replace(/[ ,]?[ ,]{1}(um|uh)[ ,]{1}/gi, " ")
        .replace(/yak/gi, "Yac")
        .replace(/amen/gi, "Hey man")
        .replace(/a sink/gi, "async");

      return { transcript: transcriptWithReplacements };
    } catch (error: unknown) {
      this.loggerService.error("Error in replaceUnwantedWords", { error, params }, this.constructor.name);

      return { transcript: params.transcript };
    }
  }

  private addSentenceBreaks(params: AddSentenceBreaksInput): AddSentenceBreaksOutput {
    try {
      this.loggerService.trace("addSentenceBreaks called", { params }, this.constructor.name);

      const { transcript } = params;

      const sentences = transcript.split(/(?<!\. .)\. (?!.\.)/);

      const transcriptWithBreaks = sentences.reduce((acc, sentence, i) => {
        if (i === 0) {
          return sentence.trim();
        }

        if (i % 3 === 0 && sentences.length - i > 2) {
          return `${acc}.<br><br>${sentence.trim()}`;
        }

        return `${acc}. ${sentence.trim()}`;
      }, "");

      return { transcript: transcriptWithBreaks };
    } catch (error: unknown) {
      this.loggerService.error("Error in addSentenceBreaks", { error, params }, this.constructor.name);

      return { transcript: params.transcript };
    }
  }
}

export interface TranscriptionServiceInterface {
  startTranscriptionJob(params: StartTranscriptionJobInput): Promise<StartTranscriptionJobOutput>;
  transcriptionJobCompleted(params: TranscriptionJobCompletedInput): Promise<TranscriptionJobCompletedOutput>;
  transcriptionJobFailed(params: TranscriptionJobFailedInput): Promise<TranscriptionJobFailedOutput>;
}

export interface TranscriptionServiceConfig {
  environment: EnvConfigInterface["environment"];
  bucketNames: Pick<EnvConfigInterface["bucketNames"], "message" | "transcription">;
}

export interface StartTranscriptionJobInput {
  messageFileKey: string;
  messageId: string;
}

export type StartTranscriptionJobOutput = void;

export interface TranscriptionJobCompletedInput {
  transcriptionJobName: string;
}

export type TranscriptionJobCompletedOutput = void;

export interface TranscriptionJobFailedInput {
  transcriptionJobName: string;
}

export type TranscriptionJobFailedOutput = void;

interface Transcript {
  transcript: string;
}

interface TranscriptionData {
  results: {
    transcripts: Transcript[];
  }
}

export interface ReplaceUnwantedWordsInput {
  transcript: string;
}

export interface ReplaceUnwantedWordsOutput {
  transcript: string;
}

export interface AddSentenceBreaksInput {
  transcript: string;
}

export interface AddSentenceBreaksOutput {
  transcript: string;
}
