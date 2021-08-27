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
  }

  public async startTranscriptionJob(params: StartTranscriptionJobInput): Promise<StartTranscriptionJobOutput> {
    try {
      this.loggerService.trace("startTranscriptionJob called", { params }, this.constructor.name);

      const { key } = params;

      const fileLocation = key.slice(0, key.lastIndexOf("/"));
      const fileName = key.slice(key.lastIndexOf("/") + 1, key.lastIndexOf("."));

      await this.transcribe.startTranscriptionJob({
        TranscriptionJobName: fileName,
        Media: { MediaFileUri: `s3://${this.messageBucketName}/${key}` },
        OutputKey: `${fileLocation}/`,
        OutputBucketName: this.transcriptionBucketName,
        IdentifyLanguage: true,
      }).promise();
    } catch (error: unknown) {
      this.loggerService.error("Error in startTranscriptionJob", { error, params }, this.constructor.name);

      throw error;
    }
  }

  public async transcriptionJobComplete(params: TranscriptionJobCompleteInput): Promise<TranscriptionJobCompleteOutput> {
    try {
      this.loggerService.trace("startTranscriptionJob called", { params }, this.constructor.name);

      const { key } = params;

      const { Body } = await this.transcriptionFileRepository.getObject({ key });

      if (!Body) {
        throw new NotFoundError("Transcription file not found");
      }

      const transcriptionData = JSON.parse(Body as string) as TranscriptionData;

      const transcript = transcriptionData.results.transcripts[0] ? transcriptionData.results.transcripts[0].transcript : "";

      const { transcript: transcriptWithReplacements } = this.replaceUnwantedWords({ transcript });

      const { transcript: transcriptWithBreaks } = this.addSentenceBreaks({ transcript: transcriptWithReplacements });

      const messageId = key.slice(key.lastIndexOf("/") + 1, key.lastIndexOf(".")) as MessageTranscodedSnsMessage["messageId"];

      await this.messageTranscribedSnsService.sendMessage({ messageId, transcript: transcriptWithBreaks });
    } catch (error: unknown) {
      this.loggerService.error("Error in transcriptionJobComplete", { error, params }, this.constructor.name);

      throw error;
    }
  }

  private replaceUnwantedWords(params: ReplaceUnwantedWordsInput): ReplaceUnwantedWordsOutput {
    try {
      this.loggerService.trace("replaceUnwantedWords called", { params }, this.constructor.name);

      const { transcript } = params;

      const transcriptWithReplacements = transcript
        .replace(/[ ,]?[ ,]?(um|uh)[ , ]?/gi, " ")
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
  transcriptionJobComplete(params: TranscriptionJobCompleteInput): Promise<TranscriptionJobCompleteOutput>;
}

export interface TranscriptionServiceConfig {
  bucketNames: Pick<EnvConfigInterface["bucketNames"], "message" | "transcription">;
}

export interface StartTranscriptionJobInput {
  key: string;
}

export type StartTranscriptionJobOutput = void;

export interface TranscriptionJobCompleteInput {
  key: string;
}

export type TranscriptionJobCompleteOutput = void;

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
