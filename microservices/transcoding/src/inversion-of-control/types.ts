import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  // General Services
  TranscodingServiceInterface: Symbol.for("TranscodingServiceInterface"),

  // SNS Services
  MessageTranscodedSnsServiceInterface: Symbol.for("MessageTranscodedSnsServiceInterface"),

  // S3 Processor Services
  RawMessageFileCreatedS3ProcessorServiceInterface: Symbol.for("RawMessageFileCreatedS3ProcessorServiceInterface"),
  EnhancedMessageFileCreatedS3ProcessorServiceInterface: Symbol.for("EnhancedMessageFileCreatedS3ProcessorServiceInterface"),

};

export { TYPES };
