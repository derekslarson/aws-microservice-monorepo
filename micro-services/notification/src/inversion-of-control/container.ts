import { coreContainerModule, DynamoProcessorServiceInterface, S3ProcessorServiceInterface, SnsProcessorServiceInterface } from "@yac/util";
import { Container } from "inversify";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { WebSocketController, WebSocketControllerInterface } from "../controllers/webSocket.controller";
import { ListenerMappingService, ListenerMappingServiceInterface } from "../entity-services/listenerMapping.service";
import { apiGatewayManagementFactory, ApiGatewayManagementFactory } from "../factories/apiGatewayManagement.factory";
import { jwkToPemFactory, JwkToPemFactory } from "../factories/jwkToPem.factory";
import { jwtFactory, JwtFactory } from "../factories/jwt.factory";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { GroupCreatedSnsProcessorService } from "../processor-services/groupCreated.sns.processor.service";
import { UserAddedToGroupSnsProcessorService } from "../processor-services/userAddedToGroup.sns.processor.service";
import { UserAddedToMeetingSnsProcessorService } from "../processor-services/userAddedToMeeting.sns.processor.service";
import { UserAddedToTeamSnsProcessorService } from "../processor-services/userAddedToTeam.sns.processor.service";
import { UserRemovedFromGroupSnsProcessorService } from "../processor-services/userRemovedFromGroup.sns.processor.service";
import { UserRemovedFromTeamSnsProcessorService } from "../processor-services/userRemovedFromTeam.sns.processor.service";
import { ListenerMappingDynamoRepository, ListenerMappingRepositoryInterface } from "../repositories/listenerMapping.dynamo.repository";
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

  // SNS Processor Services
  container.bind<SnsProcessorServiceInterface>(TYPES.UserAddedToTeamSnsProcessorServiceInterface).to(UserAddedToTeamSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserRemovedFromTeamSnsProcessorServiceInterface).to(UserRemovedFromTeamSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserAddedToGroupSnsProcessorServiceInterface).to(UserAddedToGroupSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserRemovedFromGroupSnsProcessorServiceInterface).to(UserRemovedFromGroupSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserAddedToMeetingSnsProcessorServiceInterface).to(UserAddedToMeetingSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.GroupCreatedSnsProcessorServiceInterface).to(GroupCreatedSnsProcessorService);

  // Entity Services
  container.bind<ListenerMappingServiceInterface>(TYPES.ListenerMappingServiceInterface).to(ListenerMappingService);

  // General Services
  container.bind<TokenVerificationServiceInterface>(TYPES.TokenVerificationServiceInterface).to(TokenVerificationService);
  container.bind<WebSocketServiceInterface>(TYPES.WebSocketServiceInterface).to(WebSocketService);

  // Repositories
  container.bind<ListenerMappingRepositoryInterface>(TYPES.ListenerMappingRepositoryInterface).to(ListenerMappingDynamoRepository);

  // Factories
  container.bind<ApiGatewayManagementFactory>(TYPES.ApiGatewayManagementFactory).toFactory(() => apiGatewayManagementFactory);
  container.bind<JwtFactory>(TYPES.JwtFactory).toFactory(() => jwtFactory);
  container.bind<JwkToPemFactory>(TYPES.JwkToPemFactory).toFactory(() => jwkToPemFactory);

  // Processor Services Arrays (need to be below all other bindings for container.get to function correctly)
  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([
    container.get(TYPES.UserAddedToTeamSnsProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromTeamSnsProcessorServiceInterface),
    container.get(TYPES.UserAddedToGroupSnsProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromGroupSnsProcessorServiceInterface),
    container.get(TYPES.UserAddedToMeetingSnsProcessorServiceInterface),
    container.get(TYPES.GroupCreatedSnsProcessorServiceInterface),
  ]);

  container.bind<S3ProcessorServiceInterface[]>(TYPES.S3ProcessorServicesInterface).toConstantValue([]);

  container.bind<DynamoProcessorServiceInterface[]>(TYPES.DynamoProcessorServicesInterface).toConstantValue([]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
