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
  MailServiceInterface: Symbol.for("MailServiceInterface"),

  UserCreatedProcessorServiceInterface: Symbol.for("UserCreatedProcessorServiceInterface"),

  CognitoFactory: Symbol.for("CognitoFactory"),
  CryptoFactory: Symbol.for("CryptoFactory"),
  SesFactory: Symbol.for("SesFactory"),
};

export { TYPES };
