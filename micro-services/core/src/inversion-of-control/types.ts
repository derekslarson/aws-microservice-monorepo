import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  // Controllers
  ConversationControllerInterface: Symbol.for("ConversationControllerInterface"),
  OneOnOneControllerInterface: Symbol.for("OneOnOneControllerInterface"),
  GroupControllerInterface: Symbol.for("GroupControllerInterface"),
  MeetingControllerInterface: Symbol.for("MeetingControllerInterface"),
  MessageControllerInterface: Symbol.for("MessageControllerInterface"),
  OrganizationControllerInterface: Symbol.for("OrganizationControllerInterface"),
  TeamControllerInterface: Symbol.for("TeamControllerInterface"),
  UserControllerInterface: Symbol.for("UserControllerInterface"),

  // Services
  ConversationServiceInterface: Symbol.for("ConversationServiceInterface"),
  GroupServiceInterface: Symbol.for("GroupServiceInterface"),
  InvitationServiceInterface: Symbol.for("InvitationServiceInterface"),
  MeetingServiceInterface: Symbol.for("MeetingServiceInterface"),
  MessageServiceInterface: Symbol.for("MessageServiceInterface"),
  OneOnOneAndGroupServiceInterface: Symbol.for("OneOnOneAndGroupServiceInterface"),
  OneOnOneServiceInterface: Symbol.for("OneOnOneServiceInterface"),
  OrganizationServiceInterface: Symbol.for("OrganizationServiceInterface"),
  TeamServiceInterface: Symbol.for("TeamServiceInterface"),
  UserServiceInterface: Symbol.for("UserServiceInterface"),

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
  OneOnOneCreatedDynamoProcessorServiceInterface: Symbol.for("OneOnOneCreatedDynamoProcessorServiceInterface"),
  OneOnOneDeletedDynamoProcessorServiceInterface: Symbol.for("OneOnOneDeletedDynamoProcessorServiceInterface"),
  UserNameUpdatedDynamoProcessorServiceInterface: Symbol.for("UserNameUpdatedDynamoProcessorServiceInterface"),
  TeamCreatedDynamoProcessorServiceInterface: Symbol.for("TeamCreatedDynamoProcessorServiceInterface"),
  MeetingCreatedDynamoProcessorServiceInterface: Symbol.for("MeetingCreatedDynamoProcessorServiceInterface"),
  MembershipCreatedDynamoProcessorServiceInterface: Symbol.for("MembershipCreatedDynamoProcessorServiceInterface"),
  GroupCreatedDynamoProcessorServiceInterface: Symbol.for("GroupCreatedDynamoProcessorServiceInterface"),
  MessageCreatedDynamoProcessorServiceInterface: Symbol.for("MessageCreatedDynamoProcessorServiceInterface"),
  MessageUpdatedDynamoProcessorServiceInterface: Symbol.for("MessageUpdatedDynamoProcessorServiceInterface"),
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
  MessageCreatedSnsServiceInterface: Symbol.for("MessageCreatedSnsServiceInterface"),
  MessageUpdatedSnsServiceInterface: Symbol.for("MessageUpdatedSnsServiceInterface"),
  CreateUserRequestSnsServiceInterface: Symbol.for("CreateUserRequestSnsServiceInterface"),

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
