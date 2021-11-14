import { Container } from "inversify";
import { coreContainerModule, SnsProcessorServiceInterface } from "@yac/util";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/env.config";

import { AuthenticationController, AuthenticationControllerInterface } from "../controllers/authentication.controller";

import { AuthenticationService, AuthenticationServiceInterface } from "../services/authentication.service";
import { MailService, MailServiceInterface } from "../services/mail.service";

import { cognitoFactory, CognitoFactory } from "../factories/cognito.factory";
import { sesFactory, SesFactory } from "../factories/ses.factory";
import { ClientService, ClientServiceInterface } from "../services/client.service";
import { ClientController, ClientControllerInterface } from "../controllers/client.controller";
import { UserCreatedProcessorService } from "../processor-services/userCreated.processor.service";
import { AuthorizationService, AuthorizationServiceInterface } from "../services/authorization.service";
import { AuthorizationController, AuthorizationControllerInterface } from "../controllers/authorization.controller";
import { ExternalProviderUserMappingDynamoRepository, ExternalProviderUserMappingRepositoryInterface } from "../repositories/externalProviderUserMapping.dynamo.repository";
import { ExternalProviderUserMappingService, ExternalProviderUserMappingServiceInterface } from "../services/externalProviderUserMapping.service";
import { ExternalProviderUserSignedUpSnsService, ExternalProviderUserSignedUpSnsServiceInterface } from "../sns-services/externalProviderUserSignedUp.sns.service";
import { UserPoolService, UserPoolServiceInterface } from "../services/userPool.service";

const container = new Container();

try {
  container.load(coreContainerModule);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  container.bind<AuthenticationControllerInterface>(TYPES.AuthenticationControllerInterface).to(AuthenticationController);
  container.bind<AuthorizationControllerInterface>(TYPES.AuthorizationControllerInterface).to(AuthorizationController);
  container.bind<ClientControllerInterface>(TYPES.ClientControllerInterface).to(ClientController);

  container.bind<AuthenticationServiceInterface>(TYPES.AuthenticationServiceInterface).to(AuthenticationService);
  container.bind<AuthorizationServiceInterface>(TYPES.AuthorizationServiceInterface).to(AuthorizationService);
  container.bind<ClientServiceInterface>(TYPES.ClientServiceInterface).to(ClientService);
  container.bind<ExternalProviderUserMappingServiceInterface>(TYPES.ExternalProviderUserMappingServiceInterface).to(ExternalProviderUserMappingService);
  container.bind<MailServiceInterface>(TYPES.MailServiceInterface).to(MailService);
  container.bind<UserPoolServiceInterface>(TYPES.UserPoolServiceInterface).to(UserPoolService);

  container.bind<ExternalProviderUserSignedUpSnsServiceInterface>(TYPES.ExternalProviderUserSignedUpSnsServiceInterface).to(ExternalProviderUserSignedUpSnsService);

  container.bind<SnsProcessorServiceInterface>(TYPES.UserCreatedProcessorServiceInterface).to(UserCreatedProcessorService);

  container.bind<ExternalProviderUserMappingRepositoryInterface>(TYPES.ExternalProviderUserMappingRepositoryInterface).to(ExternalProviderUserMappingDynamoRepository);

  container.bind<CognitoFactory>(TYPES.CognitoFactory).toFactory(() => cognitoFactory);
  container.bind<SesFactory>(TYPES.SesFactory).toFactory(() => sesFactory);

  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([
    container.get(TYPES.UserCreatedProcessorServiceInterface),
  ]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
