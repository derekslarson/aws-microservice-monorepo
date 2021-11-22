import { Container } from "inversify";
import { coreContainerModule, SnsProcessorServiceInterface } from "@yac/util";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { MailService, MailServiceInterface } from "../services/mail.service";
import { cognitoFactory, CognitoFactory } from "../factories/cognito.factory";
import { sesFactory, SesFactory } from "../factories/ses.factory";
import { ClientService, ClientServiceInterface } from "../services/client.service";
import { ClientController, ClientControllerInterface } from "../controllers/client.controller";
import { UserCreatedProcessorService } from "../processor-services/userCreated.processor.service";
import { ExternalProviderUserMappingDynamoRepository, ExternalProviderUserMappingRepositoryInterface } from "../repositories/externalProviderUserMapping.dynamo.repository";
import { ExternalProviderUserMappingService, ExternalProviderUserMappingServiceInterface } from "../services/externalProviderUserMapping.service";
import { ExternalProviderUserSignedUpSnsService, ExternalProviderUserSignedUpSnsServiceInterface } from "../sns-services/externalProviderUserSignedUp.sns.service";
import { UserPoolService, UserPoolServiceInterface } from "../services/userPool.service";
import { UserDynamoRepository, UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { ClientDynamoRepository, ClientRepositoryInterface } from "../repositories/client.dynamo.repository";
import { AuthFlowAttemptDynamoRepository, AuthFlowAttemptRepositoryInterface } from "../repositories/authFlowAttempt.dynamo.repository";
import { csrfFactory, CsrfFactory } from "../factories/csrf.factory";
import { AuthService, AuthServiceInterface } from "../services/auth.service";
import { AuthController, AuthControllerInterface } from "../controllers/auth.controller";
import { joseFactory, JoseFactory } from "../factories/jose.factory";
import { TokenService, TokenServiceInterface } from "../services/token.service";

const container = new Container();

try {
  container.load(coreContainerModule);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  container.bind<AuthControllerInterface>(TYPES.AuthControllerInterface).to(AuthController);
  container.bind<ClientControllerInterface>(TYPES.ClientControllerInterface).to(ClientController);

  container.bind<AuthServiceInterface>(TYPES.AuthServiceInterface).to(AuthService);
  container.bind<ClientServiceInterface>(TYPES.ClientServiceInterface).to(ClientService);
  container.bind<ExternalProviderUserMappingServiceInterface>(TYPES.ExternalProviderUserMappingServiceInterface).to(ExternalProviderUserMappingService);
  container.bind<MailServiceInterface>(TYPES.MailServiceInterface).to(MailService);
  container.bind<TokenServiceInterface>(TYPES.TokenServiceInterface).to(TokenService);
  container.bind<UserPoolServiceInterface>(TYPES.UserPoolServiceInterface).to(UserPoolService);

  container.bind<ExternalProviderUserSignedUpSnsServiceInterface>(TYPES.ExternalProviderUserSignedUpSnsServiceInterface).to(ExternalProviderUserSignedUpSnsService);

  container.bind<SnsProcessorServiceInterface>(TYPES.UserCreatedProcessorServiceInterface).to(UserCreatedProcessorService);

  container.bind<AuthFlowAttemptRepositoryInterface>(TYPES.AuthFlowAttemptRepositoryInterface).to(AuthFlowAttemptDynamoRepository);
  container.bind<ClientRepositoryInterface>(TYPES.ClientRepositoryInterface).to(ClientDynamoRepository);
  container.bind<UserRepositoryInterface>(TYPES.UserRepositoryInterface).to(UserDynamoRepository);

  container.bind<ExternalProviderUserMappingRepositoryInterface>(TYPES.ExternalProviderUserMappingRepositoryInterface).to(ExternalProviderUserMappingDynamoRepository);

  container.bind<CognitoFactory>(TYPES.CognitoFactory).toFactory(() => cognitoFactory);
  container.bind<CsrfFactory>(TYPES.CsrfFactory).toFactory(() => csrfFactory);
  container.bind<JoseFactory>(TYPES.JoseFactory).toFactory(() => joseFactory);
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
