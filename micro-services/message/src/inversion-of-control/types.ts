import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  MessagesControllerInterface: Symbol.for("MessagesControllerInterface"),

  MessagesServiceInterface: Symbol.for("MessagesServiceInterface"),

  MessageFileSystemRepositoryInterface: Symbol.for("MessageFileSystemRepositoryInterface"),
};

export { TYPES };
