import { TYPES as CORE_TYPES } from "@yac/core";

const TYPES = {
  ...CORE_TYPES,
  EnvConfigInterface: Symbol.for("EnvConfigInterface"),

  AuthenticationControllerInterface: Symbol.for("AuthenticationControllerInterface"),

  AuthenticationServiceInterface: Symbol.for("AuthenticationServiceInterface"),
  MailServiceInterface: Symbol.for("MailServiceInterface"),

  CognitoFactory: Symbol.for("CognitoFactory"),
  CryptoFactory: Symbol.for("CryptoFactory"),
  SesFactory: Symbol.for("SesFactory"),
};

export { TYPES };
