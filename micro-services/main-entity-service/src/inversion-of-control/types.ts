import { TYPES as CORE_TYPES } from "@yac/core";

const TYPES = {
  ...CORE_TYPES,

  ConversationServiceInterface: Symbol.for("ConversationServiceInterface"),
  ConversationRepositoryInterface: Symbol.for("ConversationRepositoryInterface"),

  UserSignedUpProcessorServiceInterface: Symbol.for("UserSignedUpProcessorServiceInterface"),
  UserControllerInterface: Symbol.for("UserControllerInterface"),
  UserServiceInterface: Symbol.for("UserServiceInterface"),
  UserRepositoryInterface: Symbol.for("UserRepositoryInterface"),

  TeamControllerInterface: Symbol.for("TeamControllerInterface"),
  TeamServiceInterface: Symbol.for("TeamServiceInterface"),
  TeamRepositoryInterface: Symbol.for("TeamRepositoryInterface"),

  MessageServiceInterface: Symbol.for("MessageServiceInterface"),
  MessageRepositoryInterface: Symbol.for("MessageRepositoryInterface"),
};

export { TYPES };
