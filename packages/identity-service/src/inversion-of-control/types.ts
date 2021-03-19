import { TYPES as CORE_TYPES } from "@yac/core";

const TYPES = {
  ...CORE_TYPES,

  AuthControllerInterface: Symbol.for("AuthControllerInterface"),
  AuthorizationServiceInterface: Symbol.for("AuthorizationServiceInterface"),
  AuthenticationServiceInterface: Symbol.for("AuthenticationServiceInterface"),
  EnvConfigInterface: Symbol.for("EnvConfigInterface"),

};

export { TYPES };
