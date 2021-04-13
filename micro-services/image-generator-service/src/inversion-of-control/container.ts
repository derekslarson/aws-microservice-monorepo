import { Container } from "inversify";
import { container as baseContainer, ProcessorServiceInterface } from "@yac/core";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { ImageDynamoRepository } from "../repositories/image.dynamo.repository";

const container = new Container();

try {
  container.load(baseContainer);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);
  container.bind<ImageDynamoRepository>(TYPES.ImageDynamoRepository).to(ImageDynamoRepository);
  // This processor service array needs to be binded at the bottom, so that 'container.get' can resolve all other dependencies
  container.bind<ProcessorServiceInterface[]>(TYPES.ProcessorServicesInterface).toConstantValue([]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
