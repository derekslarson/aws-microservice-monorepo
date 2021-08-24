import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  // Controllers
  WebSocketControllerInterface: Symbol.for("WebSocketControllerInterface"),

  // Mediator Services
  WebSocketMediatorServiceInterface: Symbol.for("WebSocketMediatorServiceInterface"),

  // SNS Processor Services
  UserAddedToTeamSnsProcessorServiceInterface: Symbol.for("UserAddedToTeamSnsProcessorServiceInterface"),
  UserRemovedFromTeamSnsProcessorServiceInterface: Symbol.for("UserRemovedFromTeamSnsProcessorServiceInterface"),
  UserAddedToGroupSnsProcessorServiceInterface: Symbol.for("UserAddedToGroupSnsProcessorServiceInterface"),
  UserRemovedFromGroupSnsProcessorServiceInterface: Symbol.for("UserRemovedFromGroupSnsProcessorServiceInterface"),
  UserAddedToMeetingSnsProcessorServiceInterface: Symbol.for("UserAddedToMeetingSnsProcessorServiceInterface"),
  UserRemovedFromMeetingSnsProcessorServiceInterface: Symbol.for("UserRemovedFromMeetingSnsProcessorServiceInterface"),
  UserAddedAsFriendSnsProcessorServiceInterface: Symbol.for("UserAddedAsFriendSnsProcessorServiceInterface"),
  TeamCreatedSnsProcessorServiceInterface: Symbol.for("TeamCreatedSnsProcessorServiceInterface"),
  MeetingCreatedSnsProcessorServiceInterface: Symbol.for("MeetingCreatedSnsProcessorServiceInterface"),

  // Entity Services
  ListenerMappingServiceInterface: Symbol.for("ListenerMappingServiceInterface"),

  // General Services
  TokenVerificationServiceInterface: Symbol.for("TokenVerificationServiceInterface"),
  WebSocketServiceInterface: Symbol.for("WebSocketServiceInterface"),

  // Repositories
  ListenerMappingRepositoryInterface: Symbol.for("ListenerMappingRepositoryInterface"),

  // Factories
  ApiGatewayManagementFactory: Symbol.for("ApiGatewayManagementFactory"),
  JwtFactory: Symbol.for("JwtFactory"),
  JwkToPemFactory: Symbol.for("JwkToPemFactory"),
};

export { TYPES };
