import { TYPES as CORE_TYPES } from "@yac/core";

const TYPES = {
  ...CORE_TYPES,

  // Controllers
  ConversationControllerInterface: Symbol.for("ConversationControllerInterface"),
  FriendControllerInterface: Symbol.for("FriendControllerInterface"),
  GroupControllerInterface: Symbol.for("GroupControllerInterface"),
  MeetingControllerInterface: Symbol.for("MeetingControllerInterface"),
  MessageControllerInterface: Symbol.for("MessageControllerInterface"),
  TeamControllerInterface: Symbol.for("TeamControllerInterface"),
  UserControllerInterface: Symbol.for("UserControllerInterface"),

  // Mediator Services
  ConversationMediatorServiceInterface: Symbol.for("ConversationMediatorServiceInterface"),
  FriendshipMediatorServiceInterface: Symbol.for("FriendshipMediatorServiceInterface"),
  GroupMediatorServiceInterface: Symbol.for("GroupMediatorServiceInterface"),
  MeetingMediatorServiceInterface: Symbol.for("MeetingMediatorServiceInterface"),
  MessageMediatorServiceInterface: Symbol.for("MessageMediatorServiceInterface"),
  TeamMediatorServiceInterface: Symbol.for("TeamMediatorServiceInterface"),

  // Processor Services
  UserSignedUpProcessorServiceInterface: Symbol.for("UserSignedUpProcessorServiceInterface"),

  // Services
  ConversationServiceInterface: Symbol.for("ConversationServiceInterface"),
  ConversationUserRelationshipServiceInterface: Symbol.for("ConversationUserRelationshipServiceInterface"),
  MessageServiceInterface: Symbol.for("MessageServiceInterface"),
  TeamServiceInterface: Symbol.for("TeamServiceInterface"),
  TeamUserRelationshipServiceInterface: Symbol.for("TeamUserRelationshipServiceInterface"),
  UserServiceInterface: Symbol.for("UserServiceInterface"),

  // Repositories
  ConversationRepositoryInterface: Symbol.for("ConversationRepositoryInterface"),
  ConversationUserRelationshipRepositoryInterface: Symbol.for("ConversationUserRelationshipRepositoryInterface"),
  MessageRepositoryInterface: Symbol.for("MessageRepositoryInterface"),
  TeamRepositoryInterface: Symbol.for("TeamRepositoryInterface"),
  TeamUserRelationshipRepositoryInterface: Symbol.for("TeamUserRelationshipRepositoryInterface"),
  UserRepositoryInterface: Symbol.for("UserRepositoryInterface"),
};

export { TYPES };
