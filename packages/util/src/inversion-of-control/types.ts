const TYPES = {
  EnvConfigInterface: Symbol.for("EnvConfigInterface"),

  DynamoStreamControllerInterface: Symbol.for("DynamoStreamControllerInterface"),
  S3EventControllerInterface: Symbol.for("S3EventControllerInterface"),
  SnsEventControllerInterface: Symbol.for("SnsEventControllerInterface"),
  SqsEventControllerInterface: Symbol.for("SqsEventControllerInterface"),

  HttpRequestServiceInterface: Symbol.for("HttpRequestServiceInterface"),
  IdServiceInterface: Symbol.for("IdServiceInterface"),
  LoggerServiceInterface: Symbol.for("LoggerServiceInterface"),
  MessageUploadTokenServiceInterface: Symbol.for("MessageUploadTokenServiceInterface"),
  SmsServiceInterface: Symbol.for("SmsServiceInterface"),
  ValidationServiceV2Interface: Symbol.for("ValidationServiceV2Interface"),

  DynamoProcessorServicesInterface: Symbol.for("DynamoProcessorServicesInterface"),
  S3ProcessorServicesInterface: Symbol.for("S3ProcessorServicesInterface"),
  SnsProcessorServicesInterface: Symbol.for("SnsProcessorServicesInterface"),

  EnhancedMessageFileRepositoryInterface: Symbol.for("EnhancedMessageFileRepositoryInterface"),
  RawMessageFileRepositoryInterface: Symbol.for("RawMessageFileRepositoryInterface"),

  AxiosFactory: Symbol.for("AxiosFactory"),
  ClassTransformerFactory: Symbol.for("ClassTransformerFactory"),
  ClassValidatorFactory: Symbol.for("ClassValidatorFactory"),
  CryptoFactory: Symbol.for("CryptoFactory"),
  DocumentClientFactory: Symbol.for("DocumentClientFactory"),
  ErrorSerializerFactory: Symbol.for("ErrorSerializerFactory"),
  GoogleOAuth2ClientFactory: Symbol.for("GoogleOAuth2ClientFactory"),
  JwtFactory: Symbol.for("JwtFactory"),
  FsFactory: Symbol.for("FsFactory"),
  KsuidFactory: Symbol.for("KsuidFactory"),
  LogWriterFactory: Symbol.for("LogWriterFactory"),
  PathFactory: Symbol.for("PathFactory"),
  S3Factory: Symbol.for("S3Factory"),
  SecretsManagerFactory: Symbol.for("SecretsManagerFactory"),
  SnsFactory: Symbol.for("SnsFactory"),
  UnmarshallFactory: Symbol.for("UnmarshallFactory"),
};

export { TYPES };
