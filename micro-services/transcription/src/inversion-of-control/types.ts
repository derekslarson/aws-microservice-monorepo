import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  // General Services
  TranscriptionServiceInterface: Symbol.for("TranscriptionServiceInterface"),

  // SNS Services
  MessageTranscribedSnsServiceInterface: Symbol.for("MessageTranscribedSnsServiceInterface"),

  // S3 Processor Services
  MessageTranscodedSnsProcessorServiceInterface: Symbol.for("MessageTranscodedSnsProcessorServiceInterface"),

  // S3 Processor Services
  TranscriptionFileCreatedS3ProcessorServiceInterface: Symbol.for("TranscriptionFileCreatedS3ProcessorServiceInterface"),

  // Repositories
  TranscriptionFileRepositoryInterface: Symbol.for("TranscriptionFileRepositoryInterface"),

  // Factories
  TranscribeFactory: Symbol.for("TranscribeFactory"),
};

export { TYPES };
