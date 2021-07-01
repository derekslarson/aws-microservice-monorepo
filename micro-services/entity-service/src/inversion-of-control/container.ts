import { Container } from "inversify";
import { coreContainerModule, SnsProcessorServiceInterface } from "@yac/core";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { TeamDynamoRepository, TeamRepositoryInterface } from "../repositories/team.dynamo.repository";
import { TeamService, TeamServiceInterface } from "../services/team.service";
import { TeamController, TeamControllerInterface } from "../controllers/team.controller";
import { UserController, UserControllerInterface } from "../controllers/user.controller";
import { UserService, UserServiceInterface } from "../services/user.service";
import { UserDynamoRepository, UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { UserSignedUpProcessorService } from "../services/userSignedUp.processor.service";
import { ConversationDynamoRepository, ConversationRepositoryInterface } from "../repositories/conversation.dynamo.repository";
import { ConversationUserRelationshipDynamoRepository, ConversationUserRelationshipRepositoryInterface } from "../repositories/conversationUserRelationship.dynamo.repository";
import { MessageDynamoRepository, MessageRepositoryInterface } from "../repositories/message.dynamo.repository";
import { MessageService, MessageServiceInterface } from "../services/message.service";
import { ConversationService, ConversationServiceInterface } from "../services/conversation.service";
import { ConversationUserRelationshipService, ConversationUserRelationshipServiceInterface } from "../services/conversationUserRelationship.service";
import { TeamUserRelationshipService, TeamUserRelationshipServiceInterface } from "../services/teamUserRelationship.service";
import { TeamUserRelationshipDynamoRepository, TeamUserRelationshipRepositoryInterface } from "../repositories/teamUserRelationship.dynamo.repository";
import { ConversationUserMediatorService, ConversationUserMediatorServiceInterface } from "../mediator-services/conversation.user.mediator.service";
import { TeamUserMediatorService, TeamUserMediatorServiceInterface } from "../mediator-services/team.user.mediator.service";

const container = new Container();

try {
  container.load(coreContainerModule);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  container.bind<ConversationServiceInterface>(TYPES.ConversationServiceInterface).to(ConversationService);
  container.bind<ConversationRepositoryInterface>(TYPES.ConversationRepositoryInterface).to(ConversationDynamoRepository);

  container.bind<TeamUserRelationshipServiceInterface>(TYPES.TeamUserRelationshipServiceInterface).to(TeamUserRelationshipService);
  container.bind<TeamUserRelationshipRepositoryInterface>(TYPES.TeamUserRelationshipRepositoryInterface).to(TeamUserRelationshipDynamoRepository);

  container.bind<ConversationUserRelationshipServiceInterface>(TYPES.ConversationUserRelationshipServiceInterface).to(ConversationUserRelationshipService);
  container.bind<ConversationUserRelationshipRepositoryInterface>(TYPES.ConversationUserRelationshipRepositoryInterface).to(ConversationUserRelationshipDynamoRepository);

  container.bind<ConversationUserMediatorServiceInterface>(TYPES.ConversationUserMediatorServiceInterface).to(ConversationUserMediatorService);
  container.bind<TeamUserMediatorServiceInterface>(TYPES.TeamUserMediatorServiceInterface).to(TeamUserMediatorService);

  container.bind<UserControllerInterface>(TYPES.UserControllerInterface).to(UserController);
  container.bind<UserServiceInterface>(TYPES.UserServiceInterface).to(UserService);
  container.bind<UserRepositoryInterface>(TYPES.UserRepositoryInterface).to(UserDynamoRepository);

  container.bind<TeamControllerInterface>(TYPES.TeamControllerInterface).to(TeamController);
  container.bind<TeamServiceInterface>(TYPES.TeamServiceInterface).to(TeamService);
  container.bind<TeamRepositoryInterface>(TYPES.TeamRepositoryInterface).to(TeamDynamoRepository);

  container.bind<MessageServiceInterface>(TYPES.MessageServiceInterface).to(MessageService);
  container.bind<MessageRepositoryInterface>(TYPES.MessageRepositoryInterface).to(MessageDynamoRepository);

  container.bind<SnsProcessorServiceInterface>(TYPES.UserSignedUpProcessorServiceInterface).to(UserSignedUpProcessorService);
  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([
    container.get(TYPES.UserSignedUpProcessorServiceInterface),
  ]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
