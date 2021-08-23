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

  // S3 Processor Services
  ImageFileCreatedS3ProcessorServiceInterface: Symbol.for("ImageFileCreatedS3ProcessorServiceInterface"),
  MessageFileCreatedS3ProcessorServiceInterface: Symbol.for("MessageFileCreatedS3ProcessorServiceInterface"),

  // Dynamo Processor Services
  UserCreatedDynamoProcessorServiceInterface: Symbol.for("UserCreatedDynamoProcessorServiceInterface"),
  UserAddedToTeamDynamoProcessorServiceInterface: Symbol.for("UserAddedToTeamDynamoProcessorServiceInterface"),
  UserRemovedFromTeamDynamoProcessorServiceInterface: Symbol.for("UserRemovedFromTeamDynamoProcessorServiceInterface"),
  UserAddedToGroupDynamoProcessorServiceInterface: Symbol.for("UserAddedToGroupDynamoProcessorServiceInterface"),
  UserRemovedFromGroupDynamoProcessorServiceInterface: Symbol.for("UserRemovedFromGroupDynamoProcessorServiceInterface"),
  UserAddedToMeetingDynamoProcessorServiceInterface: Symbol.for("UserAddedToMeetingDynamoProcessorServiceInterface"),
  UserRemovedFromMeetingDynamoProcessorServiceInterface: Symbol.for("UserRemovedFromMeetingDynamoProcessorServiceInterface"),
  UserAddedAsFriendDynamoProcessorServiceInterface: Symbol.for("UserAddedAsFriendDynamoProcessorServiceInterface"),
  UserRemovedAsFriendDynamoProcessorServiceInterface: Symbol.for("UserRemovedAsFriendDynamoProcessorServiceInterface"),
  TeamCreatedDynamoProcessorServiceInterface: Symbol.for("TeamCreatedDynamoProcessorServiceInterface"),
  GroupCreatedDynamoProcessorServiceInterface: Symbol.for("GroupCreatedDynamoProcessorServiceInterface"),
  FriendMessageCreatedDynamoProcessorServiceInterface: Symbol.for("FriendMessageCreatedDynamoProcessorServiceInterface"),
  FriendMessageUpdatedDynamoProcessorServiceInterface: Symbol.for("FriendMessageUpdatedDynamoProcessorServiceInterface"),
  GroupMessageCreatedDynamoProcessorServiceInterface: Symbol.for("GroupMessageCreatedDynamoProcessorServiceInterface"),
  GroupMessageUpdatedDynamoProcessorServiceInterface: Symbol.for("GroupMessageUpdatedDynamoProcessorServiceInterface"),
  MeetingMessageCreatedDynamoProcessorServiceInterface: Symbol.for("MeetingMessageCreatedDynamoProcessorServiceInterface"),

  // SNS Services
  UserCreatedSnsServiceInterface: Symbol.for("UserCreatedSnsServiceInterface"),
  UserAddedToTeamSnsServiceInterface: Symbol.for("UserAddedToTeamSnsServiceInterface"),
  UserRemovedFromTeamSnsServiceInterface: Symbol.for("UserRemovedFromTeamSnsServiceInterface"),
  UserAddedToGroupSnsServiceInterface: Symbol.for("UserAddedToGroupSnsServiceInterface"),
  UserRemovedFromGroupSnsServiceInterface: Symbol.for("UserRemovedFromGroupSnsServiceInterface"),
  UserAddedToMeetingSnsServiceInterface: Symbol.for("UserAddedToMeetingSnsServiceInterface"),
  UserRemovedFromMeetingSnsServiceInterface: Symbol.for("UserRemovedFromMeetingSnsServiceInterface"),
  UserAddedAsFriendSnsServiceInterface: Symbol.for("UserAddedAsFriendSnsServiceInterface"),
  UserRemovedAsFriendSnsServiceInterface: Symbol.for("UserRemovedAsFriendSnsServiceInterface"),
  TeamCreatedSnsServiceInterface: Symbol.for("TeamCreatedSnsServiceInterface"),
  GroupCreatedSnsServiceInterface: Symbol.for("GroupCreatedSnsServiceInterface"),
  FriendMessageCreatedSnsServiceInterface: Symbol.for("FriendMessageCreatedSnsServiceInterface"),
  FriendMessageUpdatedSnsServiceInterface: Symbol.for("FriendMessageUpdatedSnsServiceInterface"),
  GroupMessageCreatedSnsServiceInterface: Symbol.for("GroupMessageCreatedSnsServiceInterface"),
  GroupMessageUpdatedSnsServiceInterface: Symbol.for("GroupMessageUpdatedSnsServiceInterface"),
  MeetingMessageCreatedSnsServiceInterface: Symbol.for("MeetingMessageCreatedSnsServiceInterface"),

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

  // Factories
  IdenticonFactory: Symbol.for("IdenticonFactory"),
};

export { TYPES };
