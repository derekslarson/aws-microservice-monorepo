import { coreContainerModule, DynamoProcessorServiceInterface, S3ProcessorServiceInterface, SnsProcessorServiceInterface } from "@yac/util";
import { Container } from "inversify";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { WebSocketController, WebSocketControllerInterface } from "../controllers/webSocket.controller";
import { NotificationMappingService, NotificationMappingServiceInterface } from "../entity-services/notificationMapping.service";
import { apiGatewayManagementFactory, ApiGatewayManagementFactory } from "../factories/apiGatewayManagement.factory";
import { jwkToPemFactory, JwkToPemFactory } from "../factories/jwkToPem.factory";
import { jwtFactory, JwtFactory } from "../factories/jwt.factory";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { UserAddedToTeamProcessorService } from "../processor-services/userAddedToTeam.processor.service";
import { NotificationMappingDynamoRepository, NotificationMappingRepositoryInterface } from "../repositories/notificationMapping.dynamo.repository";
import { TokenVerificationService, TokenVerificationServiceInterface } from "../services/tokenVerification.service";
import { WebSocketService, WebSocketServiceInterface } from "../services/webSocket.service";
import { TYPES } from "./types";

const container = new Container();

try {
  container.load(coreContainerModule);

  // Config
  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  // Controllers
  container.bind<WebSocketControllerInterface>(TYPES.WebSocketControllerInterface).to(WebSocketController);

  // Mediator Services
  container.bind<WebSocketMediatorServiceInterface>(TYPES.WebSocketMediatorServiceInterface).to(WebSocketMediatorService);

  // Processor Services
  container.bind<SnsProcessorServiceInterface>(TYPES.UserAddedToTeamProcessorServiceInterface).to(UserAddedToTeamProcessorService);

  // Entity Services
  container.bind<NotificationMappingServiceInterface>(TYPES.NotificationMappingServiceInterface).to(NotificationMappingService);

  // General Services
  container.bind<TokenVerificationServiceInterface>(TYPES.TokenVerificationServiceInterface).to(TokenVerificationService);
  container.bind<WebSocketServiceInterface>(TYPES.WebSocketServiceInterface).to(WebSocketService);

  // Repositories

  container.bind<NotificationMappingRepositoryInterface>(TYPES.NotificationMappingRepositoryInterface).to(NotificationMappingDynamoRepository);

  // Factories
  container.bind<ApiGatewayManagementFactory>(TYPES.ApiGatewayManagementFactory).toFactory(() => apiGatewayManagementFactory);
  container.bind<JwtFactory>(TYPES.JwtFactory).toFactory(() => jwtFactory);
  container.bind<JwkToPemFactory>(TYPES.JwkToPemFactory).toFactory(() => jwkToPemFactory);

  // Processor Services Arrays (need to be below all other bindings for container.get to function correctly)
  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([
    container.get(TYPES.UserAddedToTeamProcessorServiceInterface),
  ]);

  container.bind<S3ProcessorServiceInterface[]>(TYPES.S3ProcessorServicesInterface).toConstantValue([]);

  container.bind<DynamoProcessorServiceInterface[]>(TYPES.DynamoProcessorServicesInterface).toConstantValue([]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
