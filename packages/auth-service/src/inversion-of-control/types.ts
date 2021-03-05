import { TYPES as CORE_TYPES } from "@yac/core";

const TYPES = {
  ...CORE_TYPES,
  EnvConfigInterface: Symbol.for("EnvConfigInterface"),

  AuthenticationControllerInterface: Symbol.for("AuthenticationControllerInterface"),
  ClientControllerInterface: Symbol.for("ClientControllerInterface"),

  AuthenticationServiceInterface: Symbol.for("AuthenticationServiceInterface"),
  ClientServiceInterface: Symbol.for("ClientServiceInterface"),
  MailServiceInterface: Symbol.for("MailServiceInterface"),

  ClientRepositoryInterface: Symbol.for("ClientRepositoryInterface"),

  CognitoFactory: Symbol.for("CognitoFactory"),
  CryptoFactory: Symbol.for("CryptoFactory"),
  SesFactory: Symbol.for("SesFactory"),
};

export { TYPES };
