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
import { MessageDynamoRepository, MessageRepositoryInterface } from "../repositories/message.dynamo.repository";
import { MessageService, MessageServiceInterface } from "../services/message.service";

const container = new Container();

try {
  container.load(coreContainerModule);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  container.bind<ConversationRepositoryInterface>(TYPES.ConversationRepositoryInterface).to(ConversationDynamoRepository);

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
