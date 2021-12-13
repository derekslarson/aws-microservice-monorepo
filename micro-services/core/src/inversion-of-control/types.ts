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
  InvitationOrchestratorServiceInterface: Symbol.for("InvitationOrchestratorServiceInterface"),

  // Mediator Services
  ConversationMediatorServiceInterface: Symbol.for("ConversationMediatorServiceInterface"),
  FriendshipMediatorServiceInterface: Symbol.for("FriendshipMediatorServiceInterface"),
  GroupMediatorServiceInterface: Symbol.for("GroupMediatorServiceInterface"),
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
  TeamCreatedDynamoProcessorServiceInterface: Symbol.for("TeamCreatedDynamoProcessorServiceInterface"),
  MeetingCreatedDynamoProcessorServiceInterface: Symbol.for("MeetingCreatedDynamoProcessorServiceInterface"),
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
  GroupMembershipServiceInterface: Symbol.for("GroupMembershipServiceInterface"),
  MeetingServiceInterface: Symbol.for("MeetingServiceInterface"),
  MeetingMembershipServiceInterface: Symbol.for("MeetingMembershipServiceInterface"),
  MessageServiceInterface: Symbol.for("MessageServiceInterface"),
  OneOnOneMembershipServiceInterface: Symbol.for("OneOnOneMembershipServiceInterface"),
  OrganizationServiceInterface: Symbol.for("OrganizationServiceInterface"),
  OrganizationMembershipServiceInterface: Symbol.for("OrganizationMembershipServiceInterface"),
  PendingMessageServiceInterface: Symbol.for("PendingMessageServiceInterface"),
  PendingInvitationServiceInterface: Symbol.for("PendingInvitationServiceInterface"),
  SearchServiceInterface: Symbol.for("SearchServiceInterface"),
  TeamServiceInterface: Symbol.for("TeamServiceInterface"),
  TeamMembershipServiceInterface: Symbol.for("TeamMembershipServiceInterface"),
  UserServiceInterface: Symbol.for("UserServiceInterface"),
  UserGroupMeetingSearchServiceInterface: Symbol.for("UserGroupMeetingSearchServiceInterface"),

  // Repositories
  GroupRepositoryInterface: Symbol.for("GroupRepositoryInterface"),
  GroupMembershipRepositoryInterface: Symbol.for("GroupMembershipRepositoryInterface"),
  ImageFileRepositoryInterface: Symbol.for("ImageFileRepositoryInterface"),
  MeetingRepositoryInterface: Symbol.for("MeetingRepositoryInterface"),
  MeetingMembershipRepositoryInterface: Symbol.for("MeetingMembershipRepositoryInterface"),
  MessageRepositoryInterface: Symbol.for("MessageRepositoryInterface"),
  OneOnOneMembershipRepositoryInterface: Symbol.for("OneOnOneMembershipRepositoryInterface"),
  OrganizationRepositoryInterface: Symbol.for("OrganizationRepositoryInterface"),
  OrganizationMembershipRepositoryInterface: Symbol.for("OrganizationMembershipRepositoryInterface"),
  PendingMessageRepositoryInterface: Symbol.for("PendingMessageRepositoryInterface"),
  PendingInvitationRepositoryInterface: Symbol.for("PendingInvitationRepositoryInterface"),
  SearchRepositoryInterface: Symbol.for("SearchRepositoryInterface"),
  TeamRepositoryInterface: Symbol.for("TeamRepositoryInterface"),
  TeamMembershipRepositoryInterface: Symbol.for("TeamMembershipRepositoryInterface"),
  UserRepositoryInterface: Symbol.for("UserRepositoryInterface"),

  // Factories
  Aws4Factory: Symbol.for("Aws4Factory"),
  IdenticonFactory: Symbol.for("IdenticonFactory"),
};

export { TYPES };
