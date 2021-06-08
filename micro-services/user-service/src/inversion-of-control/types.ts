import { TYPES as CORE_TYPES } from "@yac/core";

const TYPES = {
  ...CORE_TYPES,
  UserSignedUpProcessorServiceInterface: Symbol.for("UserSignedUpProcessorServiceInterface"),

  UserServiceInterface: Symbol.for("UserServiceInterface"),

  UserRepositoryInterface: Symbol.for("UserRepositoryInterface"),
};

export { TYPES };
