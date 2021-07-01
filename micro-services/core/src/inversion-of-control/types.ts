const TYPES = {
  EnvConfigInterface: Symbol.for("EnvConfigInterface"),

  DynamoStreamControllerInterface: Symbol.for("DynamoStreamControllerInterface"),
  SnsEventControllerInterface: Symbol.for("SnsEventControllerInterface"),

  ClientsUpdatedSnsServiceInterface: Symbol.for("ClientsUpdatedSnsServiceInterface"),
  HttpRequestServiceInterface: Symbol.for("HttpRequestServiceInterface"),
  IdServiceInterface: Symbol.for("IdServiceInterface"),
  LoggerServiceInterface: Symbol.for("LoggerServiceInterface"),
  UserSignedUpSnsServiceInterface: Symbol.for("UserSignedUpSnsServiceInterface"),
  ValidationServiceInterface: Symbol.for("ValidationServiceInterface"),
  ValidationServiceV2Interface: Symbol.for("ValidationServiceV2Interface"),

  DynamoProcessorServicesInterface: Symbol.for("DynamoProcessorServicesInterface"),
  SnsProcessorServicesInterface: Symbol.for("SnsProcessorServicesInterface"),

  AxiosFactory: Symbol.for("AxiosFactory"),
  ClassTransformerFactory: Symbol.for("ClassTransformerFactory"),
  ClassValidatorFactory: Symbol.for("ClassValidatorFactory"),
  DocumentClientFactory: Symbol.for("DocumentClientFactory"),
  ErrorSerializerFactory: Symbol.for("ErrorSerializerFactory"),
  KsuidFactory: Symbol.for("KsuidFactory"),
  LogWriterFactory: Symbol.for("LogWriterFactory"),
  SnsFactory: Symbol.for("SnsFactory"),
  UnmarshallFactory: Symbol.for("UnmarshallFactory"),
  UuidV4Factory: Symbol.for("UuidV4Factory"),
};

export { TYPES };
