import { Container } from "inversify";
import { coreContainerModule as baseContainer } from "@yac/util";
import { TYPES } from "./types";
import { MessageEFSRepository, MessageEFSRepositoryInterface } from "../repositories/message.efs.repository";
import { MessageS3Repository, MessageS3RepositoryInterface } from "../repositories/message.s3.repository";
import { MessageService, MessageServiceInterface } from "../services/message.service";
import { MessagesController, MessagesControllerInterface } from "../controllers/messages.controller";

const container = new Container();

try {
  container.load(baseContainer);

  container.bind<MessageEFSRepositoryInterface>(TYPES.MessageEFSRepository).to(MessageEFSRepository);
  container.bind<MessageS3RepositoryInterface>(TYPES.MessageS3Repository).to(MessageS3Repository);

  container.bind<MessageServiceInterface>(TYPES.MessagesService).to(MessageService);

  container.bind<MessagesControllerInterface>(TYPES.MessagesController).to(MessagesController);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
