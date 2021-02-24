const TYPES = {
  EnvConfigInterface: Symbol.for("EnvConfigInterface"),

  DynamoStreamControllerInterface: Symbol.for("DynamoStreamControllerInterface"),
  GroupControllerInterface: Symbol.for("GroupControllerInterface"),

  GroupServiceInterface: Symbol.for("GroupServiceInterface"),
  IdServiceInterface: Symbol.for("IdServiceInterface"),
  LoggerServiceInterface: Symbol.for("LoggerServiceInterface"),
  GroupUpdatedProcessorService: Symbol.for("GroupUpdatedProcessorService"),
  ValidationServiceInterface: Symbol.for("ValidationServiceInterface"),

  ProcessorServicesInterface: Symbol.for("ProcessorServicesInterface"),

  GroupRepositoryInterface: Symbol.for("GroupRepositoryInterface"),

  ClassTransformerFactory: Symbol.for("ClassTransformerFactory"),
  ClassValidatorFactory: Symbol.for("ClassValidatorFactory"),
  DocumentClientFactory: Symbol.for("DocumentClientFactory"),
  ErrorSerializerFactory: Symbol.for("ErrorSerializerFactory"),
  LogWriterFactory: Symbol.for("LogWriterFactory"),
  UnmarshallFactory: Symbol.for("UnmarshallFactory"),
  UuidV4Factory: Symbol.for("UuidV4Factory"),
};

export { TYPES };
