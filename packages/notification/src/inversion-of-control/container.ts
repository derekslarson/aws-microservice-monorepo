import { Container } from "inversify";
import { utilContainerModule } from "@yac/util/src/inversion-of-control/container";
import { SnsProcessorServiceInterface } from "@yac/util/src/services/interfaces/sns.processor.service.interface";
import { S3ProcessorServiceInterface } from "@yac/util/src/services/interfaces/s3.processor.service.interface";
import { DynamoProcessorServiceInterface } from "@yac/util/src/services/interfaces/dynamo.processor.service.interface";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { WebSocketController, WebSocketControllerInterface } from "../controllers/webSocket.controller";
import { ListenerMappingService, ListenerMappingServiceInterface } from "../entity-services/listenerMapping.service";
import { apiGatewayManagementFactory, ApiGatewayManagementFactory } from "../factories/apiGatewayManagement.factory";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../mediator-services/webSocket.mediator.service";
import { MeetingCreatedSnsProcessorService } from "../processor-services/meetingCreated.sns.processor.service";
import { GroupCreatedSnsProcessorService } from "../processor-services/groupCreated.sns.processor.service";
import { TeamCreatedSnsProcessorService } from "../processor-services/teamCreated.sns.processor.service";
import { UserAddedAsFriendSnsProcessorService } from "../processor-services/userAddedAsFriend.sns.processor.service";
import { UserAddedToGroupSnsProcessorService } from "../processor-services/userAddedToGroup.sns.processor.service";
import { UserAddedToMeetingSnsProcessorService } from "../processor-services/userAddedToMeeting.sns.processor.service";
import { UserAddedToTeamSnsProcessorService } from "../processor-services/userAddedToTeam.sns.processor.service";
import { UserRemovedAsFriendSnsProcessorService } from "../processor-services/userRemovedAsFriend.sns.processor.service";
import { UserRemovedFromGroupSnsProcessorService } from "../processor-services/userRemovedFromGroup.sns.processor.service";
import { UserRemovedFromMeetingSnsProcessorService } from "../processor-services/userRemovedFromMeeting.sns.processor.service";
import { UserRemovedFromTeamSnsProcessorService } from "../processor-services/userRemovedFromTeam.sns.processor.service";
import { ListenerMappingDynamoRepository, ListenerMappingRepositoryInterface } from "../repositories/listenerMapping.dynamo.repository";
import { WebSocketService, WebSocketServiceInterface } from "../services/webSocket.service";
import { TYPES } from "./types";
import { PushNotificationService, PushNotificationServiceInterface } from "../services/pushNotification.service";
import { PushNotificationMediatorService, PushNotificationMediatorServiceInterface } from "../mediator-services/pushNotification.mediator.service";
import { PushNotificationController, PushNotificationControllerInterface } from "../controllers/pushNotification.controller";
import { MessageCreatedSnsProcessorService } from "../processor-services/messageCreated.sns.processor.service";
import { MessageUpdatedSnsProcessorService } from "../processor-services/messageUpdated.sns.processor.service";

const container = new Container();

try {
  container.load(utilContainerModule);

  // Config
  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  // Controllers
  container.bind<PushNotificationControllerInterface>(TYPES.PushNotificationControllerInterface).to(PushNotificationController);
  container.bind<WebSocketControllerInterface>(TYPES.WebSocketControllerInterface).to(WebSocketController);

  // Mediator Services
  container.bind<PushNotificationMediatorServiceInterface>(TYPES.PushNotificationMediatorServiceInterface).to(PushNotificationMediatorService);
  container.bind<WebSocketMediatorServiceInterface>(TYPES.WebSocketMediatorServiceInterface).to(WebSocketMediatorService);

  // SNS Processor Services
  container.bind<SnsProcessorServiceInterface>(TYPES.UserAddedToTeamSnsProcessorServiceInterface).to(UserAddedToTeamSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserRemovedFromTeamSnsProcessorServiceInterface).to(UserRemovedFromTeamSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserAddedToGroupSnsProcessorServiceInterface).to(UserAddedToGroupSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserRemovedFromGroupSnsProcessorServiceInterface).to(UserRemovedFromGroupSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserAddedToMeetingSnsProcessorServiceInterface).to(UserAddedToMeetingSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserRemovedFromMeetingSnsProcessorServiceInterface).to(UserRemovedFromMeetingSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserAddedAsFriendSnsProcessorServiceInterface).to(UserAddedAsFriendSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.UserRemovedAsFriendSnsProcessorServiceInterface).to(UserRemovedAsFriendSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.TeamCreatedSnsProcessorServiceInterface).to(TeamCreatedSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.MeetingCreatedSnsProcessorServiceInterface).to(MeetingCreatedSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.GroupCreatedSnsProcessorServiceInterface).to(GroupCreatedSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.MessageCreatedSnsProcessorServiceInterface).to(MessageCreatedSnsProcessorService);
  container.bind<SnsProcessorServiceInterface>(TYPES.MessageUpdatedSnsProcessorServiceInterface).to(MessageUpdatedSnsProcessorService);

  // Entity Services
  container.bind<ListenerMappingServiceInterface>(TYPES.ListenerMappingServiceInterface).to(ListenerMappingService);

  // General Services
  container.bind<PushNotificationServiceInterface>(TYPES.PushNotificationServiceInterface).to(PushNotificationService);
  container.bind<WebSocketServiceInterface>(TYPES.WebSocketServiceInterface).to(WebSocketService);

  // Repositories
  container.bind<ListenerMappingRepositoryInterface>(TYPES.ListenerMappingRepositoryInterface).to(ListenerMappingDynamoRepository);

  // Factories
  container.bind<ApiGatewayManagementFactory>(TYPES.ApiGatewayManagementFactory).toFactory(() => apiGatewayManagementFactory);

  // Processor Services Arrays (need to be below all other bindings for container.get to function correctly)
  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([
    container.get(TYPES.UserAddedToTeamSnsProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromTeamSnsProcessorServiceInterface),
    container.get(TYPES.UserAddedToGroupSnsProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromGroupSnsProcessorServiceInterface),
    container.get(TYPES.UserAddedToMeetingSnsProcessorServiceInterface),
    container.get(TYPES.UserRemovedFromMeetingSnsProcessorServiceInterface),
    container.get(TYPES.UserAddedAsFriendSnsProcessorServiceInterface),
    container.get(TYPES.UserRemovedAsFriendSnsProcessorServiceInterface),
    container.get(TYPES.TeamCreatedSnsProcessorServiceInterface),
    container.get(TYPES.MeetingCreatedSnsProcessorServiceInterface),
    container.get(TYPES.GroupCreatedSnsProcessorServiceInterface),
    container.get(TYPES.MessageCreatedSnsProcessorServiceInterface),
    container.get(TYPES.MessageUpdatedSnsProcessorServiceInterface),
  ]);

  container.bind<S3ProcessorServiceInterface[]>(TYPES.S3ProcessorServicesInterface).toConstantValue([]);

  container.bind<DynamoProcessorServiceInterface[]>(TYPES.DynamoProcessorServicesInterface).toConstantValue([]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
