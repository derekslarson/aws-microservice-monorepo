import { coreContainerModule, DynamoProcessorServiceInterface, S3ProcessorServiceInterface, SnsProcessorServiceInterface } from "@yac/util";
import { Container } from "inversify";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { transcribeFactory, TranscribeFactory } from "../factories/transcribe.factory";
import { MessageTranscodedSnsProcessorService } from "../processor-services/messageTranscoded.sns.processor.service";
import { TranscriptionFileCreatedS3ProcessorService } from "../processor-services/transcriptionFileCreated.s3.processor.service";
import { TranscriptionFileRepositoryInterface, TranscriptionS3Repository } from "../repositories/transcriptionFile.repository";
import { TranscriptionService, TranscriptionServiceInterface } from "../services/transcription.service";
import { MessageTranscribedSnsService, MessageTranscribedSnsServiceInterface } from "../sns-services/messageTranscribed.sns.service";
import { TYPES } from "./types";

const container = new Container();

try {
  container.load(coreContainerModule);

  // Config
  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  // General Services
  container.bind<TranscriptionServiceInterface>(TYPES.TranscriptionServiceInterface).to(TranscriptionService);

  // SNS Services
  container.bind<MessageTranscribedSnsServiceInterface>(TYPES.MessageTranscribedSnsServiceInterface).to(MessageTranscribedSnsService);

  // S3 Processor Services
  container.bind<S3ProcessorServiceInterface>(TYPES.TranscriptionFileCreatedS3ProcessorServiceInterface).to(TranscriptionFileCreatedS3ProcessorService);

  // SNS Processor Services
  container.bind<SnsProcessorServiceInterface>(TYPES.MessageTranscodedSnsProcessorServiceInterface).to(MessageTranscodedSnsProcessorService);

  // Repositories
  container.bind<TranscriptionFileRepositoryInterface>(TYPES.TranscriptionFileRepositoryInterface).to(TranscriptionS3Repository);

  // Factories
  container.bind<TranscribeFactory>(TYPES.TranscribeFactory).toFactory(() => transcribeFactory);

  // Processor Services Arrays (need to be below all other bindings for container.get to function correctly)
  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([
    container.get(TYPES.MessageTranscodedSnsProcessorServiceInterface),
  ]);

  container.bind<S3ProcessorServiceInterface[]>(TYPES.S3ProcessorServicesInterface).toConstantValue([
    container.get(TYPES.TranscriptionFileCreatedS3ProcessorServiceInterface),
  ]);

  container.bind<DynamoProcessorServiceInterface[]>(TYPES.DynamoProcessorServicesInterface).toConstantValue([]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
