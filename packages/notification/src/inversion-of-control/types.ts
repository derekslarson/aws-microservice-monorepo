import { TYPES as UTIL_TYPES } from "@yac/util/src/inversion-of-control/types";

const TYPES = {
  ...UTIL_TYPES,

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
  MessageCreatedSnsProcessorServiceInterface: Symbol.for("MessageCreatedSnsProcessorServiceInterface"),
  MessageUpdatedSnsProcessorServiceInterface: Symbol.for("MessageUpdatedSnsProcessorServiceInterface"),

  // Entity Services
  ListenerMappingServiceInterface: Symbol.for("ListenerMappingServiceInterface"),

  // General Services
  PushNotificationServiceInterface: Symbol.for("PushNotificationServiceInterface"),
  WebSocketServiceInterface: Symbol.for("WebSocketServiceInterface"),

  // Repositories
  ListenerMappingRepositoryInterface: Symbol.for("ListenerMappingRepositoryInterface"),

  // Factories
  ApiGatewayManagementFactory: Symbol.for("ApiGatewayManagementFactory"),
};

export { TYPES };
