import { TYPES as UTIL_TYPES } from "@yac/util/src/inversion-of-control/types";

const TYPES = {
  ...UTIL_TYPES,

  // Services
  TranscodingServiceInterface: Symbol.for("TranscodingServiceInterface"),

  // SNS Services
  MessageTranscodedSnsServiceInterface: Symbol.for("MessageTranscodedSnsServiceInterface"),

  // S3 Processor Services
  RawMessageFileCreatedS3ProcessorServiceInterface: Symbol.for("RawMessageFileCreatedS3ProcessorServiceInterface"),
  EnhancedMessageFileCreatedS3ProcessorServiceInterface: Symbol.for("EnhancedMessageFileCreatedS3ProcessorServiceInterface"),

};

export { TYPES };
