const TYPES = {
  EnvConfigInterface: Symbol.for("EnvConfigInterface"),

  DynamoStreamControllerInterface: Symbol.for("DynamoStreamControllerInterface"),
  S3EventControllerInterface: Symbol.for("S3EventControllerInterface"),
  SnsEventControllerInterface: Symbol.for("SnsEventControllerInterface"),

  ClientsUpdatedSnsServiceInterface: Symbol.for("ClientsUpdatedSnsServiceInterface"),
  HttpRequestServiceInterface: Symbol.for("HttpRequestServiceInterface"),
  IdServiceInterface: Symbol.for("IdServiceInterface"),
  LoggerServiceInterface: Symbol.for("LoggerServiceInterface"),
  UserSignedUpSnsServiceInterface: Symbol.for("UserSignedUpSnsServiceInterface"),
  ValidationServiceInterface: Symbol.for("ValidationServiceInterface"),
  ValidationServiceV2Interface: Symbol.for("ValidationServiceV2Interface"),

  DynamoProcessorServicesInterface: Symbol.for("DynamoProcessorServicesInterface"),
  S3ProcessorServicesInterface: Symbol.for("S3ProcessorServicesInterface"),
  SnsProcessorServicesInterface: Symbol.for("SnsProcessorServicesInterface"),

  MessageS3RepositoryInterface: Symbol.for("MessageS3RepositoryInterface"),

  AxiosFactory: Symbol.for("AxiosFactory"),
  ClassTransformerFactory: Symbol.for("ClassTransformerFactory"),
  ClassValidatorFactory: Symbol.for("ClassValidatorFactory"),
  DocumentClientFactory: Symbol.for("DocumentClientFactory"),
  ErrorSerializerFactory: Symbol.for("ErrorSerializerFactory"),
  KsuidFactory: Symbol.for("KsuidFactory"),
  LogWriterFactory: Symbol.for("LogWriterFactory"),
  S3Factory: Symbol.for("S3Factory"),
  SnsFactory: Symbol.for("SnsFactory"),
  UnmarshallFactory: Symbol.for("UnmarshallFactory"),
  UuidV4Factory: Symbol.for("UuidV4Factory"),
};

export { TYPES };
