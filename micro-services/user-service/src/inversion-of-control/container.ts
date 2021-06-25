import { Container } from "inversify";
import { coreContainerModule, SnsProcessorServiceInterface } from "@yac/core";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { UserSignedUpProcessorService } from "../services/userSignedUp.processor.service";
import { UserDynamoRepository, UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { UserService, UserServiceInterface } from "../services/user.service";
import { UserController, UserControllerInterface } from "../controllers/user.controller";

const container = new Container();

try {
  container.load(coreContainerModule);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  container.bind<SnsProcessorServiceInterface>(TYPES.UserSignedUpProcessorServiceInterface).to(UserSignedUpProcessorService);

  container.bind<UserControllerInterface>(TYPES.UserControllerInterface).to(UserController);

  container.bind<UserServiceInterface>(TYPES.UserServiceInterface).to(UserService);

  container.bind<UserRepositoryInterface>(TYPES.UserRepositoryInterface).to(UserDynamoRepository);

  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([
    container.get(TYPES.UserSignedUpProcessorServiceInterface),
  ]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
