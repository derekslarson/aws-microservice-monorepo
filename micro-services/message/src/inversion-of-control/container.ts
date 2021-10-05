import { Container } from "inversify";
import { coreContainerModule as baseContainer } from "@yac/util";
import { TYPES } from "./types";
import { MessageEFSRepository, MessageEFSRepositoryInterface } from "../repositories/message.efs.repository";
import { MessageService, MessageServiceInterface } from "../services/message.service";
import { MessagesController, MessagesControllerInterface } from "../controllers/messages.controller";
import { envConfig, EnvConfigInterface } from "../config/env.config";

const container = new Container();

try {
  container.load(baseContainer);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  container.bind<MessageEFSRepositoryInterface>(TYPES.MessageEFSRepository).to(MessageEFSRepository);

  container.bind<MessageServiceInterface>(TYPES.MessagesService).to(MessageService);

  container.bind<MessagesControllerInterface>(TYPES.MessagesController).to(MessagesController);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
