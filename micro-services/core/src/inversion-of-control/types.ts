import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  // Controllers
  ConversationControllerInterface: Symbol.for("ConversationControllerInterface"),
  FriendControllerInterface: Symbol.for("FriendControllerInterface"),
  GroupControllerInterface: Symbol.for("GroupControllerInterface"),
  MeetingControllerInterface: Symbol.for("MeetingControllerInterface"),
  MessageControllerInterface: Symbol.for("MessageControllerInterface"),
  OrganizationControllerInterface: Symbol.for("OrganizationControllerInterface"),
  TeamControllerInterface: Symbol.for("TeamControllerInterface"),
  UserControllerInterface: Symbol.for("UserControllerInterface"),

  // Orchestrator Services
  ConversationOrchestratorServiceInterface: Symbol.for("ConversationOrchestratorServiceInterface"),
  InvitationOrchestratorServiceInterface: Symbol.for("InvitationOrchestratorServiceInterface"),

  // Mediator Services
  OneOnOneMediatorServiceInterface: Symbol.for("OneOnOneMediatorServiceInterface"),
  GroupMediatorServiceInterface: Symbol.for("GroupMediatorServiceInterface"),
  OneOnOneAndGroupMediatorServiceInterface: Symbol.for("OneOnOneAndGroupMediatorServiceInterface"),
  MeetingMediatorServiceInterface: Symbol.for("MeetingMediatorServiceInterface"),
  MessageMediatorServiceInterface: Symbol.for("MessageMediatorServiceInterface"),
  OrganizationMediatorServiceInterface: Symbol.for("OrganizationMediatorServiceInterface"),
  TeamMediatorServiceInterface: Symbol.for("TeamMediatorServiceInterface"),
  UserMediatorServiceInterface: Symbol.for("UserMediatorServiceInterface"),

  // S3 Processor Services
  ImageFileCreatedS3ProcessorServiceInterface: Symbol.for("ImageFileCreatedS3ProcessorServiceInterface"),

  // SNS Processor Services
  MessageTranscodedSnsProcessorServiceInterface: Symbol.for("MessageTranscodedSnsProcessorServiceInterface"),
  MessageTranscribedSnsProcessorServiceInterface: Symbol.for("MessageTranscribedSnsProcessorServiceInterface"),
  UserCreatedSnsProcessorServiceInterface: Symbol.for("UserCreatedSnsProcessorServiceInterface"),
  BillingPlanUpdatedSnsProcessorServiceInterface: Symbol.for("BillingPlanUpdatedSnsProcessorServiceInterface"),

  // Dynamo Processor Services
  UserCreatedDynamoProcessorServiceInterface: Symbol.for("UserCreatedDynamoProcessorServiceInterface"),
  OrganizationCreatedDynamoProcessorServiceInterface: Symbol.for("OrganizationCreatedDynamoProcessorServiceInterface"),
  UserAddedToOrganizationDynamoProcessorServiceInterface: Symbol.for("UserAddedToOrganizationDynamoProcessorServiceInterface"),
  UserRemovedFromOrganizationDynamoProcessorServiceInterface: Symbol.for("UserRemovedFromOrganizationDynamoProcessorServiceInterface"),
  UserAddedToTeamDynamoProcessorServiceInterface: Symbol.for("UserAddedToTeamDynamoProcessorServiceInterface"),
  UserRemovedFromTeamDynamoProcessorServiceInterface: Symbol.for("UserRemovedFromTeamDynamoProcessorServiceInterface"),
  UserAddedToGroupDynamoProcessorServiceInterface: Symbol.for("UserAddedToGroupDynamoProcessorServiceInterface"),
  UserRemovedFromGroupDynamoProcessorServiceInterface: Symbol.for("UserRemovedFromGroupDynamoProcessorServiceInterface"),
  UserAddedToMeetingDynamoProcessorServiceInterface: Symbol.for("UserAddedToMeetingDynamoProcessorServiceInterface"),
  UserRemovedFromMeetingDynamoProcessorServiceInterface: Symbol.for("UserRemovedFromMeetingDynamoProcessorServiceInterface"),
  UserAddedAsFriendDynamoProcessorServiceInterface: Symbol.for("UserAddedAsFriendDynamoProcessorServiceInterface"),
  UserRemovedAsFriendDynamoProcessorServiceInterface: Symbol.for("UserRemovedAsFriendDynamoProcessorServiceInterface"),
  UserNameUpdatedDynamoProcessorServiceInterface: Symbol.for("UserNameUpdatedDynamoProcessorServiceInterface"),
  TeamCreatedDynamoProcessorServiceInterface: Symbol.for("TeamCreatedDynamoProcessorServiceInterface"),
  MeetingCreatedDynamoProcessorServiceInterface: Symbol.for("MeetingCreatedDynamoProcessorServiceInterface"),
  MembershipCreatedDynamoProcessorServiceInterface: Symbol.for("MembershipCreatedDynamoProcessorServiceInterface"),
  GroupCreatedDynamoProcessorServiceInterface: Symbol.for("GroupCreatedDynamoProcessorServiceInterface"),
  FriendMessageCreatedDynamoProcessorServiceInterface: Symbol.for("FriendMessageCreatedDynamoProcessorServiceInterface"),
  FriendMessageUpdatedDynamoProcessorServiceInterface: Symbol.for("FriendMessageUpdatedDynamoProcessorServiceInterface"),
  GroupMessageCreatedDynamoProcessorServiceInterface: Symbol.for("GroupMessageCreatedDynamoProcessorServiceInterface"),
  GroupMessageUpdatedDynamoProcessorServiceInterface: Symbol.for("GroupMessageUpdatedDynamoProcessorServiceInterface"),
  MeetingMessageCreatedDynamoProcessorServiceInterface: Symbol.for("MeetingMessageCreatedDynamoProcessorServiceInterface"),
  MeetingMessageUpdatedDynamoProcessorServiceInterface: Symbol.for("MeetingMessageUpdatedDynamoProcessorServiceInterface"),
  PendingInvitationCreatedDynamoProcessorServiceInterface: Symbol.for("PendingInvitationCreatedDynamoProcessorServiceInterface"),

  // SNS Services
  UserCreatedSnsServiceInterface: Symbol.for("UserCreatedSnsServiceInterface"),
  OrganizationCreatedSnsServiceInterface: Symbol.for("OrganizationCreatedSnsServiceInterface"),
  UserAddedToOrganizationSnsServiceInterface: Symbol.for("UserAddedToOrganizationSnsServiceInterface"),
  UserRemovedFromOrganizationSnsServiceInterface: Symbol.for("UserRemovedFromOrganizationSnsServiceInterface"),
  UserAddedToTeamSnsServiceInterface: Symbol.for("UserAddedToTeamSnsServiceInterface"),
  UserRemovedFromTeamSnsServiceInterface: Symbol.for("UserRemovedFromTeamSnsServiceInterface"),
  UserAddedToGroupSnsServiceInterface: Symbol.for("UserAddedToGroupSnsServiceInterface"),
  UserRemovedFromGroupSnsServiceInterface: Symbol.for("UserRemovedFromGroupSnsServiceInterface"),
  UserAddedToMeetingSnsServiceInterface: Symbol.for("UserAddedToMeetingSnsServiceInterface"),
  UserRemovedFromMeetingSnsServiceInterface: Symbol.for("UserRemovedFromMeetingSnsServiceInterface"),
  UserAddedAsFriendSnsServiceInterface: Symbol.for("UserAddedAsFriendSnsServiceInterface"),
  UserRemovedAsFriendSnsServiceInterface: Symbol.for("UserRemovedAsFriendSnsServiceInterface"),
  TeamCreatedSnsServiceInterface: Symbol.for("TeamCreatedSnsServiceInterface"),
  MeetingCreatedSnsServiceInterface: Symbol.for("MeetingCreatedSnsServiceInterface"),
  GroupCreatedSnsServiceInterface: Symbol.for("GroupCreatedSnsServiceInterface"),
  FriendMessageCreatedSnsServiceInterface: Symbol.for("FriendMessageCreatedSnsServiceInterface"),
  FriendMessageUpdatedSnsServiceInterface: Symbol.for("FriendMessageUpdatedSnsServiceInterface"),
  GroupMessageCreatedSnsServiceInterface: Symbol.for("GroupMessageCreatedSnsServiceInterface"),
  GroupMessageUpdatedSnsServiceInterface: Symbol.for("GroupMessageUpdatedSnsServiceInterface"),
  MeetingMessageCreatedSnsServiceInterface: Symbol.for("MeetingMessageCreatedSnsServiceInterface"),
  MeetingMessageUpdatedSnsServiceInterface: Symbol.for("MeetingMessageUpdatedSnsServiceInterface"),
  CreateUserRequestSnsServiceInterface: Symbol.for("CreateUserRequestSnsServiceInterface"),

  // Entity Services
  GroupServiceInterface: Symbol.for("GroupServiceInterface"),
  MeetingServiceInterface: Symbol.for("MeetingServiceInterface"),
  MembershipServiceInterface: Symbol.for("MeetingMembershipServiceInterface"),
  MessageServiceInterface: Symbol.for("MessageServiceInterface"),
  OneOnOneServiceInterface: Symbol.for("OneOnOneServiceInterface"),
  OrganizationServiceInterface: Symbol.for("OrganizationServiceInterface"),
  PendingMessageServiceInterface: Symbol.for("PendingMessageServiceInterface"),
  PendingInvitationServiceInterface: Symbol.for("PendingInvitationServiceInterface"),
  SearchServiceInterface: Symbol.for("SearchServiceInterface"),
  TeamServiceInterface: Symbol.for("TeamServiceInterface"),
  UserServiceInterface: Symbol.for("UserServiceInterface"),
  UserGroupMeetingSearchServiceInterface: Symbol.for("UserGroupMeetingSearchServiceInterface"),

  // Repositories
  GroupRepositoryInterface: Symbol.for("GroupRepositoryInterface"),
  ImageFileRepositoryInterface: Symbol.for("ImageFileRepositoryInterface"),
  MeetingRepositoryInterface: Symbol.for("MeetingRepositoryInterface"),
  MembershipRepositoryInterface: Symbol.for("MembershipRepositoryInterface"),
  MessageRepositoryInterface: Symbol.for("MessageRepositoryInterface"),
  OneOnOneRepositoryInterface: Symbol.for("OneOnOneRepositoryInterface"),
  OrganizationRepositoryInterface: Symbol.for("OrganizationRepositoryInterface"),
  PendingMessageRepositoryInterface: Symbol.for("PendingMessageRepositoryInterface"),
  PendingInvitationRepositoryInterface: Symbol.for("PendingInvitationRepositoryInterface"),
  SearchRepositoryInterface: Symbol.for("SearchRepositoryInterface"),
  TeamRepositoryInterface: Symbol.for("TeamRepositoryInterface"),
  UserRepositoryInterface: Symbol.for("UserRepositoryInterface"),

  // Factories
  Aws4Factory: Symbol.for("Aws4Factory"),
  IdenticonFactory: Symbol.for("IdenticonFactory"),
};

export { TYPES };
