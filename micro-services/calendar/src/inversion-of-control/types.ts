import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  // Controllers
  CalendarControllerInterface: Symbol.for("CalendarControllerInterface"),

  // Tier 1 Services
  GoogleAuthServiceInterface: Symbol.for("GoogleAuthServiceInterface"),

  // Tier 2 Services
  GoogleCalendarServiceInterface: Symbol.for("GoogleCalendarServiceInterface"),

  // Repositories
  AuthFlowAttemptRepositoryInterface: Symbol.for("AuthFlowAttemptRepositoryInterface"),
  GoogleCredentialsRepositoryInterface: Symbol.for("GoogleCredentialsRepositoryInterface"),

  // Factories
  GoogleCalendarFactory: Symbol.for("GoogleCalendarFactory"),
  GoogleOAuth2ClientFactory: Symbol.for("GoogleOAuth2ClientFactory"),
};

export { TYPES };
