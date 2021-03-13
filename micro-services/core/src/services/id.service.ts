import "reflect-metadata";
import { injectable, inject } from "inversify";
import { TYPES } from "../inversion-of-control/types";
import { LoggerServiceInterface } from "./logger.service";
import { UuidV4, UuidV4Factory } from "../factories/uuidV4.factory";

@injectable()
export class IdService implements IdServiceInterface {
  private uuidV4: UuidV4;

  constructor(
  @inject(TYPES.UuidV4Factory) uuidV4Factory: UuidV4Factory,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {
    this.uuidV4 = uuidV4Factory();
  }

  public generateId(): string {
    try {
      this.loggerService.trace("generateId called", {}, this.constructor.name);

      const id = this.uuidV4();

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
