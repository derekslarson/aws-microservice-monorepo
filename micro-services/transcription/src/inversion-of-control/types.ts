import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  // General Services
  TranscriptionServiceInterface: Symbol.for("TranscriptionServiceInterface"),

  // SNS Services
  MessageTranscribedSnsServiceInterface: Symbol.for("MessageTranscribedSnsServiceInterface"),

  // SNS Processor Services
  MessageTranscodedSnsProcessorServiceInterface: Symbol.for("MessageTranscodedSnsProcessorServiceInterface"),
  TranscriptionJobCompletedSnsProcessorServiceInterface: Symbol.for("TranscriptionJobCompletedSnsProcessorServiceInterface"),
  TranscriptionJobFailedSnsProcessorServiceInterface: Symbol.for("TranscriptionJobFailedSnsProcessorServiceInterface"),

  // Repositories
  TranscriptionFileRepositoryInterface: Symbol.for("TranscriptionFileRepositoryInterface"),

  // Factories
  TranscribeFactory: Symbol.for("TranscribeFactory"),
};

export { TYPES };
