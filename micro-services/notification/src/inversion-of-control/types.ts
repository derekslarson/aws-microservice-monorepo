import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  // Controllers
  PushNotificationControllerInterface: Symbol.for("PushNotificationControllerInterface"),
  WebSocketControllerInterface: Symbol.for("WebSocketControllerInterface"),

  // Mediator Services
  PushNotificationMediatorServiceInterface: Symbol.for("PushNotificationMediatorServiceInterface"),
  WebSocketMediatorServiceInterface: Symbol.for("WebSocketMediatorServiceInterface"),

  // SNS Processor Services
  UserAddedToTeamSnsProcessorServiceInterface: Symbol.for("UserAddedToTeamSnsProcessorServiceInterface"),
  UserRemovedFromTeamSnsProcessorServiceInterface: Symbol.for("UserRemovedFromTeamSnsProcessorServiceInterface"),
  UserAddedToGroupSnsProcessorServiceInterface: Symbol.for("UserAddedToGroupSnsProcessorServiceInterface"),
  UserRemovedFromGroupSnsProcessorServiceInterface: Symbol.for("UserRemovedFromGroupSnsProcessorServiceInterface"),
  UserAddedToMeetingSnsProcessorServiceInterface: Symbol.for("UserAddedToMeetingSnsProcessorServiceInterface"),
  GroupCreatedSnsProcessorServiceInterface: Symbol.for("GroupCreatedSnsProcessorServiceInterface"),
  UserRemovedFromMeetingSnsProcessorServiceInterface: Symbol.for("UserRemovedFromMeetingSnsProcessorServiceInterface"),
  UserAddedAsFriendSnsProcessorServiceInterface: Symbol.for("UserAddedAsFriendSnsProcessorServiceInterface"),
  UserRemovedAsFriendSnsProcessorServiceInterface: Symbol.for("UserRemovedAsFriendSnsProcessorServiceInterface"),
  TeamCreatedSnsProcessorServiceInterface: Symbol.for("TeamCreatedSnsProcessorServiceInterface"),
  MeetingCreatedSnsProcessorServiceInterface: Symbol.for("MeetingCreatedSnsProcessorServiceInterface"),
  FriendMessageCreatedSnsProcessorServiceInterface: Symbol.for("FriendMessageCreatedSnsProcessorServiceInterface"),
  FriendMessageUpdatedSnsProcessorServiceInterface: Symbol.for("FriendMessageUpdatedSnsProcessorServiceInterface"),
  GroupMessageCreatedSnsProcessorServiceInterface: Symbol.for("GroupMessageCreatedSnsProcessorServiceInterface"),
  GroupMessageUpdatedSnsProcessorServiceInterface: Symbol.for("GroupMessageUpdatedSnsProcessorServiceInterface"),
  MeetingMessageCreatedSnsProcessorServiceInterface: Symbol.for("MeetingMessageCreatedSnsProcessorServiceInterface"),
  MeetingMessageUpdatedSnsProcessorServiceInterface: Symbol.for("MeetingMessageUpdatedSnsProcessorServiceInterface"),

  // Entity Services
  ListenerMappingServiceInterface: Symbol.for("ListenerMappingServiceInterface"),

  // General Services
  PushNotificationServiceInterface: Symbol.for("PushNotificationServiceInterface"),
  WebSocketServiceInterface: Symbol.for("WebSocketServiceInterface"),

  // Repositories
  ListenerMappingRepositoryInterface: Symbol.for("ListenerMappingRepositoryInterface"),

  // Factories
  ApiGatewayManagementFactory: Symbol.for("ApiGatewayManagementFactory"),
  JwkToPemFactory: Symbol.for("JwkToPemFactory"),
};

export { TYPES };
