import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,
  EnvConfigInterface: Symbol.for("EnvConfigInterface"),

  AuthenticationControllerInterface: Symbol.for("AuthenticationControllerInterface"),
  AuthorizationControllerInterface: Symbol.for("AuthorizationControllerInterface"),
  ClientControllerInterface: Symbol.for("ClientControllerInterface"),

  AuthenticationServiceInterface: Symbol.for("AuthenticationServiceInterface"),
  AuthorizationServiceInterface: Symbol.for("AuthorizationServiceInterface"),
  ClientServiceInterface: Symbol.for("ClientServiceInterface"),
  ExternalProviderUserMappingServiceInterface: Symbol.for("ExternalProviderUserMappingServiceInterface"),
  MailServiceInterface: Symbol.for("MailServiceInterface"),

  ExternalProviderUserMappingFoundProcessorServiceInterface: Symbol.for("ExternalProviderUserMappingFoundProcessorServiceInterface"),
  UserCreatedProcessorServiceInterface: Symbol.for("UserCreatedProcessorServiceInterface"),

  ExternalProviderUserSignedUpSnsServiceInterface: Symbol.for("ExternalProviderUserSignedUpSnsServiceInterface"),

  ExternalProviderUserMappingRepositoryInterface: Symbol.for("ExternalProviderUserMappingRepositoryInterface"),

  CognitoFactory: Symbol.for("CognitoFactory"),
  SesFactory: Symbol.for("SesFactory"),
};

export { TYPES };
