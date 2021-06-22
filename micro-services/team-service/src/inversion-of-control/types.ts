import { TYPES as CORE_TYPES } from "@yac/core";

const TYPES = {
  ...CORE_TYPES,

  TeamControllerInterface: Symbol.for("TeamControllerInterface"),

  TeamServiceInterface: Symbol.for("TeamServiceInterface"),

  TeamRepositoryInterface: Symbol.for("TeamRepositoryInterface"),
};

export { TYPES };
