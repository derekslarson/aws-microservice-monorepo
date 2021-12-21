import { TYPES as UTIL_TYPES } from "@yac/util/src/inversion-of-control/types";

const TYPES = {
  ...UTIL_TYPES,

  MessagesControllerInterface: Symbol.for("MessagesControllerInterface"),

  MessagesServiceInterface: Symbol.for("MessagesServiceInterface"),

  MessageFileSystemRepositoryInterface: Symbol.for("MessageFileSystemRepositoryInterface"),
};

export { TYPES };
