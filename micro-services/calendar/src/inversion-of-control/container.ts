import { coreContainerModule, DynamoProcessorServiceInterface, S3ProcessorServiceInterface, SnsProcessorServiceInterface } from "@yac/util";
import { Container } from "inversify";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { TYPES } from "./types";
import { CalendarController, CalendarControllerInterface } from "../controllers/calendar.controller";
import { GoogleOAuth2ClientFactory, googleOAuth2ClientFactory } from "../factories/google.oAuth2Client.factory";
import { GoogleCredentialsRepositoryInterface, GoogleCredentialsDynamoRepository } from "../repositories/google.credentials.dynamo.repository";
import { AuthFlowAttemptDynamoRepository, AuthFlowAttemptRepositoryInterface } from "../repositories/authFlowAttempt.dynamo.repository";
import { GoogleAuthService, GoogleAuthServiceInterface } from "../mediator-services/google.auth.service";

const container = new Container();

try {
  container.load(coreContainerModule);

  // Config
  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  // Controllers
  container.bind<CalendarControllerInterface>(TYPES.CalendarControllerInterface).to(CalendarController);

  // Mediator Service
  container.bind<GoogleAuthServiceInterface>(TYPES.GoogleAuthServiceInterface).to(GoogleAuthService);

  // Repositories
  container.bind<AuthFlowAttemptRepositoryInterface>(TYPES.AuthFlowAttemptRepositoryInterface).to(AuthFlowAttemptDynamoRepository);
  container.bind<GoogleCredentialsRepositoryInterface>(TYPES.GoogleCredentialsRepositoryInterface).to(GoogleCredentialsDynamoRepository);

  // Factories
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
