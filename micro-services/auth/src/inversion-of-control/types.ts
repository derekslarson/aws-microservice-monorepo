import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,
  EnvConfigInterface: Symbol.for("EnvConfigInterface"),

  AuthControllerInterface: Symbol.for("AuthControllerInterface"),
  ClientControllerInterface: Symbol.for("ClientControllerInterface"),

  AuthServiceInterface: Symbol.for("AuthServiceInterface"),
  ClientServiceInterface: Symbol.for("ClientServiceInterface"),
  ExternalProviderUserMappingServiceInterface: Symbol.for("ExternalProviderUserMappingServiceInterface"),
  MailServiceInterface: Symbol.for("MailServiceInterface"),
  TokenServiceInterface: Symbol.for("TokenServiceInterface"),
  UserPoolServiceInterface: Symbol.for("UserPoolServiceInterface"),

  ExternalProviderUserMappingFoundProcessorServiceInterface: Symbol.for("ExternalProviderUserMappingFoundProcessorServiceInterface"),
  UserCreatedProcessorServiceInterface: Symbol.for("UserCreatedProcessorServiceInterface"),

  ExternalProviderUserSignedUpSnsServiceInterface: Symbol.for("ExternalProviderUserSignedUpSnsServiceInterface"),

  AuthFlowAttemptRepositoryInterface: Symbol.for("AuthFlowAttemptRepositoryInterface"),
  ClientRepositoryInterface: Symbol.for("ClientRepositoryInterface"),
  SessionRepositoryInterface: Symbol.for("SessionRepositoryInterface"),
  UserRepositoryInterface: Symbol.for("UserRepositoryInterface"),

  ExternalProviderUserMappingRepositoryInterface: Symbol.for("ExternalProviderUserMappingRepositoryInterface"),

  CognitoFactory: Symbol.for("CognitoFactory"),
  CsrfFactory: Symbol.for("CsrfFactory"),
  JoseFactory: Symbol.for("JoseFactory"),
  PkceChallengeFactory: Symbol.for("PkceChallengeFactory"),
  SesFactory: Symbol.for("SesFactory"),
};

export { TYPES };
