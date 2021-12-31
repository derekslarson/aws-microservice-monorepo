import { Container } from "inversify";
import { utilContainerModule } from "@yac/util/src/inversion-of-control/container";
import { TYPES } from "./types";
import { MessageEfsRepository, MessageFileSystemRepositoryInterface } from "../repositories/message.efs.repository";
import { MessageService, MessageServiceInterface } from "../services/message.service";
import { MessagesController, MessagesControllerInterface } from "../controllers/messages.controller";
import { envConfig, EnvConfigInterface } from "../config/env.config";

const container = new Container();

try {
  container.load(utilContainerModule);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  container.bind<MessageFileSystemRepositoryInterface>(TYPES.MessageFileSystemRepositoryInterface).to(MessageEfsRepository);

  container.bind<MessageServiceInterface>(TYPES.MessagesServiceInterface).to(MessageService);

  container.bind<MessagesControllerInterface>(TYPES.MessagesControllerInterface).to(MessagesController);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
