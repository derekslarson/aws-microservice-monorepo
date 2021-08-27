import { coreContainerModule, DynamoProcessorServiceInterface, S3ProcessorServiceInterface, SnsProcessorServiceInterface } from "@yac/util";
import { Container } from "inversify";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { EnhancedMessageFileCreatedS3ProcessorService } from "../processor-services/enhancedMessageFileCreated.s3.processor.service";
import { RawMessageFileCreatedS3ProcessorService } from "../processor-services/rawMessageFileCreated.s3.processor.service";
import { TranscodingService, TranscodingServiceInterface } from "../services/transcoding.service";
import { MessageTranscodedSnsService, MessageTranscodedSnsServiceInterface } from "../sns-services/messageTranscoded.sns.service";
import { TYPES } from "./types";

const container = new Container();

try {
  container.load(coreContainerModule);

  // Config
  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  // General Services
  container.bind<TranscodingServiceInterface>(TYPES.TranscodingServiceInterface).to(TranscodingService);

  // SNS Services
  container.bind<MessageTranscodedSnsServiceInterface>(TYPES.MessageTranscodedSnsServiceInterface).to(MessageTranscodedSnsService);

  // S3 Processor Services
  container.bind<S3ProcessorServiceInterface>(TYPES.RawMessageFileCreatedS3ProcessorServiceInterface).to(RawMessageFileCreatedS3ProcessorService);
  container.bind<S3ProcessorServiceInterface>(TYPES.EnhancedMessageFileCreatedS3ProcessorServiceInterface).to(EnhancedMessageFileCreatedS3ProcessorService);

  // Processor Services Arrays (need to be below all other bindings for container.get to function correctly)
  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([]);

  container.bind<S3ProcessorServiceInterface[]>(TYPES.S3ProcessorServicesInterface).toConstantValue([
    container.get(TYPES.RawMessageFileCreatedS3ProcessorServiceInterface),
    container.get(TYPES.EnhancedMessageFileCreatedS3ProcessorServiceInterface),
  ]);

  container.bind<DynamoProcessorServiceInterface[]>(TYPES.DynamoProcessorServicesInterface).toConstantValue([]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
