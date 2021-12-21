import { TYPES as CORE_TYPES } from "@yac/util";

const TYPES = {
  ...CORE_TYPES,

  // Controllers
  CalendarControllerInterface: Symbol.for("CalendarControllerInterface"),

  // Tier 1 Services
  GoogleAuthServiceInterface: Symbol.for("GoogleAuthServiceInterface"),
  GoogleSettingsServiceInterface: Symbol.for("GoogleSettingsServiceInterface"),

  // Tier 2 Services
  GoogleCalendarServiceInterface: Symbol.for("GoogleCalendarServiceInterface"),

  // Repositories
  AuthFlowAttemptRepositoryInterface: Symbol.for("AuthFlowAttemptRepositoryInterface"),
  GoogleCredentialsRepositoryInterface: Symbol.for("GoogleCredentialsRepositoryInterface"),
  GoogleSettingsRepositoryInterface: Symbol.for("GoogleSettingsRepositoryInterface"),

  // Factories
  GoogleCalendarFactory: Symbol.for("GoogleCalendarFactory"),
};

export { TYPES };
