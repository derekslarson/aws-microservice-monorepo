import { TYPES as UTIL_TYPES } from "@yac/util/src/inversion-of-control/types";

const TYPES = {
  ...UTIL_TYPES,

  // Controllers
  CalendarControllerInterface: Symbol.for("CalendarControllerInterface"),

  // Services
  GoogleAuthServiceInterface: Symbol.for("GoogleAuthServiceInterface"),
  GoogleCalendarServiceInterface: Symbol.for("GoogleCalendarServiceInterface"),
  GoogleSettingsServiceInterface: Symbol.for("GoogleSettingsServiceInterface"),

  // Repositories
  AuthFlowAttemptRepositoryInterface: Symbol.for("AuthFlowAttemptRepositoryInterface"),
  GoogleCredentialsRepositoryInterface: Symbol.for("GoogleCredentialsRepositoryInterface"),
  GoogleSettingsRepositoryInterface: Symbol.for("GoogleSettingsRepositoryInterface"),

  // Factories
  GoogleCalendarFactory: Symbol.for("GoogleCalendarFactory"),
};

export { TYPES };
