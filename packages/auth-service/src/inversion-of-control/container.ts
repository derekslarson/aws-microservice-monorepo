import { Container } from "inversify";
import { container as baseContainer, ProcessorServiceInterface } from "@yac/core";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/env.config";

import { AuthenticationController, AuthenticationControllerInterface } from "../controllers/authentication.controller";

import { AuthenticationService, AuthenticationServiceInterface } from "../services/authentication.service";
import { MailService, MailServiceInterface } from "../services/mail.service";

import { cognitoFactory, CognitoFactory } from "../factories/cognito.factory";
import { cryptoFactory, CryptoFactory } from "../factories/crypto.factory";
import { sesFactory, SesFactory } from "../factories/ses.factory";

const container = new Container();

try {
  container.load(baseContainer);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  container.bind<AuthenticationControllerInterface>(TYPES.AuthenticationControllerInterface).to(AuthenticationController);

  container.bind<AuthenticationServiceInterface>(TYPES.AuthenticationServiceInterface).to(AuthenticationService);
  container.bind<MailServiceInterface>(TYPES.MailServiceInterface).to(MailService);

  container.bind<CognitoFactory>(TYPES.CognitoFactory).toFactory(() => cognitoFactory);
  container.bind<CryptoFactory>(TYPES.CryptoFactory).toFactory(() => cryptoFactory);
  container.bind<SesFactory>(TYPES.SesFactory).toFactory(() => sesFactory);

  // This processor service array needs to be binded at the bottom, so that 'container.get' can resolve all other dependencies
  container.bind<ProcessorServiceInterface[]>(TYPES.ProcessorServicesInterface).toConstantValue([]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
