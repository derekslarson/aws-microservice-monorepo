const TYPES = {
  EnvConfigInterface: Symbol.for("EnvConfigInterface"),

  DynamoStreamControllerInterface: Symbol.for("DynamoStreamControllerInterface"),

  HttpRequestServiceInterface: Symbol.for("HttpRequestServiceInterface"),
  IdServiceInterface: Symbol.for("IdServiceInterface"),
  LoggerServiceInterface: Symbol.for("LoggerServiceInterface"),
  ValidationServiceInterface: Symbol.for("ValidationServiceInterface"),

  ProcessorServicesInterface: Symbol.for("ProcessorServicesInterface"),

  AxiosFactory: Symbol.for("AxiosFactory"),
  ClassTransformerFactory: Symbol.for("ClassTransformerFactory"),
  ClassValidatorFactory: Symbol.for("ClassValidatorFactory"),
  DocumentClientFactory: Symbol.for("DocumentClientFactory"),
  ErrorSerializerFactory: Symbol.for("ErrorSerializerFactory"),
  LogWriterFactory: Symbol.for("LogWriterFactory"),
  UnmarshallFactory: Symbol.for("UnmarshallFactory"),
  UuidV4Factory: Symbol.for("UuidV4Factory"),
};

export { TYPES };
