import "reflect-metadata";
import { injectable, inject } from "inversify";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "./logger.service";
import { Ksuid, KsuidFactory } from "../factories/ksuid.factory";

@injectable()
export class IdService implements IdServiceInterface {
  private ksuid: Ksuid;

  constructor(
  @inject(TYPES.KsuidFactory) ksuidFactory: KsuidFactory,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {
    this.ksuid = ksuidFactory();
  }

  public generateId(): string {
    try {
      this.loggerService.trace("generateId called", {}, this.constructor.name);

      const id = this.ksuid.randomSync().string;

      return id;
    } catch (error: unknown) {
      this.loggerService.error("Error in generateId", { error }, this.constructor.name);

      throw error;
    }
  }
}

export interface IdServiceInterface {
  generateId(): string;
}
