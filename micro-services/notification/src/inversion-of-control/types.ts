import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  // Controllers
  WebSocketControllerInterface: Symbol.for("WebSocketControllerInterface"),

  // Mediator Services
  WebSocketMediatorServiceInterface: Symbol.for("WebSocketMediatorServiceInterface"),

  // Processor Services
  UserAddedToTeamSnsProcessorServiceInterface: Symbol.for("UserAddedToTeamSnsProcessorServiceInterface"),

  // Entity Services
  NotificationMappingServiceInterface: Symbol.for("NotificationMappingServiceInterface"),

  // General Services
  TokenVerificationServiceInterface: Symbol.for("TokenVerificationServiceInterface"),
  WebSocketServiceInterface: Symbol.for("WebSocketServiceInterface"),

  // Repositories
  NotificationMappingRepositoryInterface: Symbol.for("NotificationMappingRepositoryInterface"),

  // Factories
  ApiGatewayManagementFactory: Symbol.for("ApiGatewayManagementFactory"),
  JwtFactory: Symbol.for("JwtFactory"),
  JwkToPemFactory: Symbol.for("JwkToPemFactory"),
};

export { TYPES };
