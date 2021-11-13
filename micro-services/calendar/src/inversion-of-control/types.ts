import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  // Controllers
  CalendarControllerInterface: Symbol.for("CalendarControllerInterface"),

  // Mediator Services
  GoogleAuthServiceInterface: Symbol.for("GoogleAuthServiceInterface"),

  // Repositories
  AuthFlowAttemptRepositoryInterface: Symbol.for("AuthFlowAttemptRepositoryInterface"),
  GoogleCredentialsRepositoryInterface: Symbol.for("GoogleCredentialsRepositoryInterface"),

  // Factories
  GoogleOAuth2ClientFactory: Symbol.for("GoogleOAuth2ClientFactory"),
};

export { TYPES };
