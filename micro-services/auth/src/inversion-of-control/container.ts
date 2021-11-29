import { Container } from "inversify";
import { coreContainerModule, DynamoProcessorServiceInterface, SnsProcessorServiceInterface } from "@yac/util";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { MailService, MailServiceInterface } from "../services/tier-1/mail.service";
import { sesFactory, SesFactory } from "../factories/ses.factory";
import { ClientService, ClientServiceInterface } from "../services/tier-1/client.service";
import { ClientController, ClientControllerInterface } from "../controllers/client.controller";
import { UserDynamoRepository, UserRepositoryInterface } from "../repositories/user.dynamo.repository";
import { ClientDynamoRepository, ClientRepositoryInterface } from "../repositories/client.dynamo.repository";
import { AuthFlowAttemptDynamoRepository, AuthFlowAttemptRepositoryInterface } from "../repositories/authFlowAttempt.dynamo.repository";
import { csrfFactory, CsrfFactory } from "../factories/csrf.factory";
import { AuthService, AuthServiceInterface } from "../services/tier-2/auth.service";
import { AuthController, AuthControllerInterface } from "../controllers/auth.controller";
import { joseFactory, JoseFactory } from "../factories/jose.factory";
import { TokenService, TokenServiceInterface } from "../services/tier-1/token.service";
import { SessionDynamoRepository, SessionRepositoryInterface } from "../repositories/session.dyanmo.repository";
import { pkceChallengeFactory, PkceChallengeFactory } from "../factories/pkceChallenge.factory";
import { UserController, UserControllerInterface } from "../controllers/user.controller";
import { JwksDynamoRepository, JwksRepositoryInterface } from "../repositories/jwks.dynamo.repository";
import { slackOAuth2ClientFactory, SlackOAuth2ClientFactory } from "../factories/slackOAuth2Client.factory";
import { UserCreatedSnsService, UserCreatedSnsServiceInterface } from "../sns-services/userCreated.sns.service";
import { UserCreatedDynamoProcessorService } from "../processor-services/userCreated.dynamo.processor.service";
import { UserService, UserServiceInterface } from "../services/tier-1/user.service";
import { CreateUserRequestSnsProcessorService } from "../processor-services/createUserRequest.sns.processor.service";

const container = new Container();

try {
  container.load(coreContainerModule);

  // Environment Variables
  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  // Controllers
  container.bind<AuthControllerInterface>(TYPES.AuthControllerInterface).to(AuthController);
  container.bind<ClientControllerInterface>(TYPES.ClientControllerInterface).to(ClientController);
  container.bind<UserControllerInterface>(TYPES.UserControllerInterface).to(UserController);

  // Services
  container.bind<AuthServiceInterface>(TYPES.AuthServiceInterface).to(AuthService);
  container.bind<ClientServiceInterface>(TYPES.ClientServiceInterface).to(ClientService);
  container.bind<MailServiceInterface>(TYPES.MailServiceInterface).to(MailService);
  container.bind<TokenServiceInterface>(TYPES.TokenServiceInterface).to(TokenService);
  container.bind<UserServiceInterface>(TYPES.UserServiceInterface).to(UserService);

  // SNS Services
  container.bind<UserCreatedSnsServiceInterface>(TYPES.UserCreatedSnsServiceInterface).to(UserCreatedSnsService);

  // Dynamo Processor Services
  container.bind<DynamoProcessorServiceInterface>(TYPES.UserCreatedDynamoProcessorServiceInterface).to(UserCreatedDynamoProcessorService);

  // SNS Processor Services
  container.bind<SnsProcessorServiceInterface>(TYPES.CreateUserRequestSnsProcessorServiceInterface).to(CreateUserRequestSnsProcessorService);

  // Repositories
  container.bind<AuthFlowAttemptRepositoryInterface>(TYPES.AuthFlowAttemptRepositoryInterface).to(AuthFlowAttemptDynamoRepository);
  container.bind<ClientRepositoryInterface>(TYPES.ClientRepositoryInterface).to(ClientDynamoRepository);
  container.bind<JwksRepositoryInterface>(TYPES.JwksRepositoryInterface).to(JwksDynamoRepository);
  container.bind<SessionRepositoryInterface>(TYPES.SessionRepositoryInterface).to(SessionDynamoRepository);
  container.bind<UserRepositoryInterface>(TYPES.UserRepositoryInterface).to(UserDynamoRepository);

  // Factories
  container.bind<CsrfFactory>(TYPES.CsrfFactory).toFactory(() => csrfFactory);
  container.bind<JoseFactory>(TYPES.JoseFactory).toFactory(() => joseFactory);
  container.bind<PkceChallengeFactory>(TYPES.PkceChallengeFactory).toFactory(() => pkceChallengeFactory);
  container.bind<SesFactory>(TYPES.SesFactory).toFactory(() => sesFactory);
  container.bind<SlackOAuth2ClientFactory>(TYPES.SlackOAuth2ClientFactory).toFactory(() => slackOAuth2ClientFactory);

  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([
    container.get(TYPES.CreateUserRequestSnsProcessorServiceInterface),
  ]);

  container.bind<DynamoProcessorServiceInterface[]>(TYPES.DynamoProcessorServicesInterface).toConstantValue([
    container.get(TYPES.UserCreatedDynamoProcessorServiceInterface),
  ]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
