import { TYPES as CORE_TYPES } from "@yac/util";

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
  WebSocketControllerInterface: Symbol.for("WebSocketControllerInterface"),

  // Orchestrator Services
  InvitationOrchestratorServiceInterface: Symbol.for("InvitationOrchestratorServiceInterface"),

  // Mediator Services
  ConversationMediatorServiceInterface: Symbol.for("ConversationMediatorServiceInterface"),
  FriendshipMediatorServiceInterface: Symbol.for("FriendshipMediatorServiceInterface"),
  GroupMediatorServiceInterface: Symbol.for("GroupMediatorServiceInterface"),
  MeetingMediatorServiceInterface: Symbol.for("MeetingMediatorServiceInterface"),
  MessageMediatorServiceInterface: Symbol.for("MessageMediatorServiceInterface"),
  TeamMediatorServiceInterface: Symbol.for("TeamMediatorServiceInterface"),
  UserMediatorServiceInterface: Symbol.for("UserMediatorServiceInterface"),
  WebSocketMediatorServiceInterface: Symbol.for("WebSocketMediatorServiceInterface"),

  // Processor Services
  ImageFileCreatedProcessorServiceInterface: Symbol.for("ImageFileCreatedProcessorServiceInterface"),
  MessageFileCreatedProcessorServiceInterface: Symbol.for("MessageFileCreatedProcessorServiceInterface"),
  UserSignedUpProcessorServiceInterface: Symbol.for("UserSignedUpProcessorServiceInterface"),
  UserCreatedProcessorServiceInterface: Symbol.for("UserCreatedProcessorServiceInterface"),

  // SNS Services
  UserCreatedSnsServiceInterface: Symbol.for("UserCreatedSnsServiceInterface"),

  // Entity Services
  ConversationServiceInterface: Symbol.for("ConversationServiceInterface"),
  ConversationUserRelationshipServiceInterface: Symbol.for("ConversationUserRelationshipServiceInterface"),
  ImageFileServiceInterface: Symbol.for("ImageFileServiceInterface"),
  MessageServiceInterface: Symbol.for("MessageServiceInterface"),
  MessageFileServiceInterface: Symbol.for("MessageFileServiceInterface"),
  PendingMessageServiceInterface: Symbol.for("PendingMessageServiceInterface"),
  TeamServiceInterface: Symbol.for("TeamServiceInterface"),
  TeamUserRelationshipServiceInterface: Symbol.for("TeamUserRelationshipServiceInterface"),
  UniquePropertyServiceInterface: Symbol.for("UniquePropertyServiceInterface"),
  UserServiceInterface: Symbol.for("UserServiceInterface"),
  NotificationMappingServiceInterface: Symbol.for("NotificationMappingServiceInterface"),

  // General Services
  TokenVerificationServiceInterface: Symbol.for("TokenVerificationServiceInterface"),

  // Repositories
  ConversationRepositoryInterface: Symbol.for("ConversationRepositoryInterface"),
  ConversationUserRelationshipRepositoryInterface: Symbol.for("ConversationUserRelationshipRepositoryInterface"),
  ImageFileRepositoryInterface: Symbol.for("ImageFileRepositoryInterface"),
  MessageRepositoryInterface: Symbol.for("MessageRepositoryInterface"),
  PendingMessageRepositoryInterface: Symbol.for("PendingMessageRepositoryInterface"),
  TeamRepositoryInterface: Symbol.for("TeamRepositoryInterface"),
  TeamUserRelationshipRepositoryInterface: Symbol.for("TeamUserRelationshipRepositoryInterface"),
  UniquePropertyRepositoryInterface: Symbol.for("UniquePropertyRepositoryInterface"),
  UserRepositoryInterface: Symbol.for("UserRepositoryInterface"),
  NotificationMappingRepositoryInterface: Symbol.for("NotificationMappingRepositoryInterface"),

  // Factories
  IdenticonFactory: Symbol.for("IdenticonFactory"),
  JwtFactory: Symbol.for("JwtFactory"),
  JwkToPemFactory: Symbol.for("JwkToPemFactory"),
};

export { TYPES };
