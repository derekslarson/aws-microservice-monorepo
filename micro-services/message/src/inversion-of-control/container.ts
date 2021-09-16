import { Container } from "inversify";
import { coreContainerModule as baseContainer, MessageS3Repository } from "@yac/util";
import { TYPES } from "./types";
import { MessageEFSRepository, MessageEFSRepositoryInterface } from "../repositories/message.efs.repository";
import { MessageS3RepositoryInterface } from "../repositories/message.s3.repository";

const container = new Container();

try {
  container.load(baseContainer);

  container.bind<MessageEFSRepositoryInterface>(TYPES.MessageEFSRepository).to(MessageEFSRepository);
  container.bind<MessageS3RepositoryInterface>(TYPES.MessageS3Repository).to(MessageS3Repository);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
