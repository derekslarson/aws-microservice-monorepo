import { TYPES as UTIL_TYPES } from "@yac/util/src/inversion-of-control/types";

const TYPES = {
  ...UTIL_TYPES,

  // Services
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
