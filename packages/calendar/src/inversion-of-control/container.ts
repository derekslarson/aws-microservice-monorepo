import { Container } from "inversify";
import { utilContainerModule } from "@yac/util/src/inversion-of-control/container";
import { SnsProcessorServiceInterface } from "@yac/util/src/services/interfaces/sns.processor.service.interface";
import { S3ProcessorServiceInterface } from "@yac/util/src/services/interfaces/s3.processor.service.interface";
import { DynamoProcessorServiceInterface } from "@yac/util/src/services/interfaces/dynamo.processor.service.interface";
import { googleOAuth2ClientFactory, GoogleOAuth2ClientFactory } from "@yac/util/src/factories/google.oAuth2ClientFactory";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { TYPES } from "./types";
import { CalendarController, CalendarControllerInterface } from "../controllers/calendar.controller";
import { GoogleCredentialsRepositoryInterface, GoogleCredentialsDynamoRepository } from "../repositories/google.credentials.dynamo.repository";
import { AuthFlowAttemptDynamoRepository, AuthFlowAttemptRepositoryInterface } from "../repositories/authFlowAttempt.dynamo.repository";
import { GoogleAuthService, GoogleAuthServiceInterface } from "../services/tier-1/google.auth.service";
import { GoogleCalendarService, GoogleCalendarServiceInterface } from "../services/tier-2/google.calendar.service";
import { googleCalendarFactory, GoogleCalendarFactory } from "../factories/google.calendar.factory";
import { GoogleSettingsDynamoRepository, GoogleSettingsRepositoryInterface } from "../repositories/google.settings.dynamo.repository";
import { GoogleSettingsService, GoogleSettingsServiceInterface } from "../services/tier-1/google.settings.service";

const container = new Container();

try {
  container.load(utilContainerModule);

  // Config
  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  // Controllers
  container.bind<CalendarControllerInterface>(TYPES.CalendarControllerInterface).to(CalendarController);

  // Services
  container.bind<GoogleAuthServiceInterface>(TYPES.GoogleAuthServiceInterface).to(GoogleAuthService);
  container.bind<GoogleCalendarServiceInterface>(TYPES.GoogleCalendarServiceInterface).to(GoogleCalendarService);
  container.bind<GoogleSettingsServiceInterface>(TYPES.GoogleSettingsServiceInterface).to(GoogleSettingsService);

  // Repositories
  container.bind<AuthFlowAttemptRepositoryInterface>(TYPES.AuthFlowAttemptRepositoryInterface).to(AuthFlowAttemptDynamoRepository);
  container.bind<GoogleCredentialsRepositoryInterface>(TYPES.GoogleCredentialsRepositoryInterface).to(GoogleCredentialsDynamoRepository);
  container.bind<GoogleSettingsRepositoryInterface>(TYPES.GoogleSettingsRepositoryInterface).to(GoogleSettingsDynamoRepository);

  // Factories
  container.bind<GoogleCalendarFactory>(TYPES.GoogleCalendarFactory).toFactory(() => googleCalendarFactory);
  container.bind<GoogleOAuth2ClientFactory>(TYPES.GoogleOAuth2ClientFactory).toFactory(() => googleOAuth2ClientFactory);

  // Processor Services Arrays (need to be below all other bindings for container.get to function correctly)
  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([]);

  container.bind<S3ProcessorServiceInterface[]>(TYPES.S3ProcessorServicesInterface).toConstantValue([]);

  container.bind<DynamoProcessorServiceInterface[]>(TYPES.DynamoProcessorServicesInterface).toConstantValue([]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
