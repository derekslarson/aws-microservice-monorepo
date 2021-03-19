import { Container } from "inversify";
import { container as baseContainer, ProcessorServiceInterface } from "@yac/core";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { AuthenticationService, AuthenticationServiceInterface } from "../services/authentication.service";
import { AuthController, AuthControllerInterface } from "../controllers/auth.controller";
import { AuthorizationService, AuthorizationServiceInterface } from "../services/authorization.service";

const container = new Container();

try {
  container.load(baseContainer);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  container.bind<AuthControllerInterface>(TYPES.AuthControllerInterface).to(AuthController);

  container.bind<AuthenticationServiceInterface>(TYPES.AuthenticationServiceInterface).to(AuthenticationService);
  container.bind<AuthorizationServiceInterface>(TYPES.AuthorizationServiceInterface).to(AuthorizationService);

  // This processor service array needs to be binded at the bottom, so that 'container.get' can resolve all other dependencies
  container.bind<ProcessorServiceInterface[]>(TYPES.ProcessorServicesInterface).toConstantValue([]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
