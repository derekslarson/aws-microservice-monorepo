import { Container } from "inversify";
import { coreContainerModule } from "@yac/core";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { TeamDynamoRepository, TeamRepositoryInterface } from "../repositories/team.dynamo.repository";
import { TeamService, TeamServiceInterface } from "../services/team.service";
import { TeamController, TeamControllerInterface } from "../controllers/team.controller";

const container = new Container();

try {
  container.load(coreContainerModule);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);

  container.bind<TeamControllerInterface>(TYPES.TeamControllerInterface).to(TeamController);

  container.bind<TeamServiceInterface>(TYPES.TeamServiceInterface).to(TeamService);

  container.bind<TeamRepositoryInterface>(TYPES.TeamRepositoryInterface).to(TeamDynamoRepository);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
