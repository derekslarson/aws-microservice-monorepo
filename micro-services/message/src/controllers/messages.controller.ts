import "reflect-metadata";
import { inject, injectable } from "inversify";
import { BaseController } from "@yac/util";

import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class MessagesController extends BaseController implements MessagesControllerInterface {
  constructor(
  ) {
    super();
  }
}

export interface MessagesControllerInterface {
}

type MessagesControllerEnvConfigType = Pick<EnvConfigInterface, "bannerbear_webhook_key">;
