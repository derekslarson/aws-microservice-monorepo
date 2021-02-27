const TYPES = {
  EnvConfigInterface: Symbol.for("EnvConfigInterface"),

  AuthenticationControllerInterface: Symbol.for("AuthenticationControllerInterface"),
  DynamoStreamControllerInterface: Symbol.for("DynamoStreamControllerInterface"),

  AuthenticationServiceInterface: Symbol.for("AuthenticationServiceInterface"),
  IdServiceInterface: Symbol.for("IdServiceInterface"),
  LoggerServiceInterface: Symbol.for("LoggerServiceInterface"),
  MailServiceInterface: Symbol.for("MailServiceInterface"),
  ValidationServiceInterface: Symbol.for("ValidationServiceInterface"),

  ProcessorServicesInterface: Symbol.for("ProcessorServicesInterface"),

  AxiosFactory: Symbol.for("AxiosFactory"),
  ClassTransformerFactory: Symbol.for("ClassTransformerFactory"),
  ClassValidatorFactory: Symbol.for("ClassValidatorFactory"),
  CognitoFactory: Symbol.for("CognitoFactory"),
  CryptoFactory: Symbol.for("CryptoFactory"),
  DocumentClientFactory: Symbol.for("DocumentClientFactory"),
  ErrorSerializerFactory: Symbol.for("ErrorSerializerFactory"),
  LogWriterFactory: Symbol.for("LogWriterFactory"),
  SesFactory: Symbol.for("SesFactory"),
  UnmarshallFactory: Symbol.for("UnmarshallFactory"),
  UuidV4Factory: Symbol.for("UuidV4Factory"),
};

export { TYPES };
