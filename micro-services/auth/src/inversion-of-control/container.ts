import { Container } from "inversify";
import { coreContainerModule, SnsProcessorServiceInterface } from "@yac/util";
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

const container = new Container();

try {
  container.load(coreContainerModule);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  container.bind<AuthControllerInterface>(TYPES.AuthControllerInterface).to(AuthController);
  container.bind<ClientControllerInterface>(TYPES.ClientControllerInterface).to(ClientController);
  container.bind<UserControllerInterface>(TYPES.UserControllerInterface).to(UserController);

  container.bind<AuthServiceInterface>(TYPES.AuthServiceInterface).to(AuthService);
  container.bind<ClientServiceInterface>(TYPES.ClientServiceInterface).to(ClientService);
  container.bind<MailServiceInterface>(TYPES.MailServiceInterface).to(MailService);
  container.bind<TokenServiceInterface>(TYPES.TokenServiceInterface).to(TokenService);

  container.bind<AuthFlowAttemptRepositoryInterface>(TYPES.AuthFlowAttemptRepositoryInterface).to(AuthFlowAttemptDynamoRepository);
  container.bind<ClientRepositoryInterface>(TYPES.ClientRepositoryInterface).to(ClientDynamoRepository);
  container.bind<SessionRepositoryInterface>(TYPES.SessionRepositoryInterface).to(SessionDynamoRepository);
  container.bind<UserRepositoryInterface>(TYPES.UserRepositoryInterface).to(UserDynamoRepository);

  container.bind<CsrfFactory>(TYPES.CsrfFactory).toFactory(() => csrfFactory);
  container.bind<JoseFactory>(TYPES.JoseFactory).toFactory(() => joseFactory);
  container.bind<PkceChallengeFactory>(TYPES.PkceChallengeFactory).toFactory(() => pkceChallengeFactory);
  container.bind<SesFactory>(TYPES.SesFactory).toFactory(() => sesFactory);

  container.bind<SnsProcessorServiceInterface[]>(TYPES.SnsProcessorServicesInterface).toConstantValue([]);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
