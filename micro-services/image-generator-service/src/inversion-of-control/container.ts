import { Container } from "inversify";
import { container as baseContainer } from "@yac/core";
import { TYPES } from "./types";
import { envConfig, EnvConfigInterface } from "../config/env.config";
import { MediaDynamoRepository, MediaDynamoRepositoryInterface } from "../repositories/media.dynamo.repository";
import { MediaService, MediaServiceInterface } from "../services/media.service";
import { BannerbearService, BannerbearServiceInterface } from "../services/bannerbear.service";
import { YacLegacyApiService, YacLegacyApiServiceInterface } from "../services/yacLegacyApi.service";
import { BannerbearController, BannerbearControllerInterface } from "../controllers/bannerbear.controller";
import { MediaController, MediaControllerInterface } from "../controllers/media.controller";

const container = new Container();

try {
  container.load(baseContainer);

  container.bind<EnvConfigInterface>(TYPES.EnvConfigInterface).toConstantValue(envConfig);
  container.bind<MediaDynamoRepositoryInterface>(TYPES.MediaDynamoRepositoryInterface).to(MediaDynamoRepository);

  container.bind<MediaServiceInterface>(TYPES.MediaServiceInterface).to(MediaService);
  container.bind<BannerbearServiceInterface>(TYPES.BannerbearServiceInterface).to(BannerbearService);
  container.bind<YacLegacyApiServiceInterface>(TYPES.YacLegacyApiServiceInterface).to(YacLegacyApiService);

  container.bind<BannerbearControllerInterface>(TYPES.BannerbearControllerInterface).to(BannerbearController);
  container.bind<MediaControllerInterface>(TYPES.MediaControllerInterface).to(MediaController);
} catch (error: unknown) {
  // eslint-disable-next-line no-console
  console.log("Error initializing container. Error:\n", error);

  throw error;
}

export { container };
