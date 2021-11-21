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
  UserPoolServiceInterface: Symbol.for("UserPoolServiceInterface"),

  ExternalProviderUserMappingFoundProcessorServiceInterface: Symbol.for("ExternalProviderUserMappingFoundProcessorServiceInterface"),
  UserCreatedProcessorServiceInterface: Symbol.for("UserCreatedProcessorServiceInterface"),

  ExternalProviderUserSignedUpSnsServiceInterface: Symbol.for("ExternalProviderUserSignedUpSnsServiceInterface"),

  AuthFlowAttemptRepositoryInterface: Symbol.for("AuthFlowAttemptRepositoryInterface"),
  ClientRepositoryInterface: Symbol.for("ClientRepositoryInterface"),
  UserRepositoryInterface: Symbol.for("UserRepositoryInterface"),

  ExternalProviderUserMappingRepositoryInterface: Symbol.for("ExternalProviderUserMappingRepositoryInterface"),

  CognitoFactory: Symbol.for("CognitoFactory"),
  CsrfFactory: Symbol.for("CsrfFactory"),
  SesFactory: Symbol.for("SesFactory"),
};

export { TYPES };
