import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepository, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface, NotFoundError } from "@yac/core";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { MediaInterface } from "../models/media.model";

@injectable()
export class MediaDynamoRepository extends BaseDynamoRepository<MediaInterface> implements MediaDynamoRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: MediaRepositoryConfigType,
  ) {
    super(envConfig.tableNames.IMAGES, documentClientFactory, idService, loggerService);
  }

  public async get(id: MediaInterface["id"]): Promise<MediaInterface> {
    try {
      this.loggerService.trace("getImage called", { id }, this.constructor.name);

      const image = await this.getByPrimaryKey(id);

      return image;
    } catch (error: unknown) {
      this.loggerService.error("Error in getImage", { error, id }, this.constructor.name);

      if (error instanceof NotFoundError) {
        throw new NotFoundError(`Image with id ${id} not found.`);
      }

      throw error;
    }
  }

  public async create(id: MediaInterface["id"], checksum: string, bannerbear_id: string, bannerbear_url?: string): Promise<MediaInterface> {
    try {
      this.loggerService.trace("createImage called", { id, checksum, bannerbear_id, bannerbear_url }, this.constructor.name);
      const image = await this.insertWithIdIncluded({
        id,
        checksum,
        bannerbear_id,
        bannerbear_url,
        createdAt: String(Date.now()),
        updatedAt: String(Date.now()),
      });

      return image;
    } catch (error: unknown) {
      this.loggerService.error("Error in createImage", { error, checksum, id, bannerbear_id, bannerbear_url }, this.constructor.name);

      throw error;
    }
  }

  public async update(id: MediaInterface["id"], bannerbear_url: string): Promise<MediaInterface> {
    try {
      this.loggerService.trace("createImage called", { id, bannerbear_url }, this.constructor.name);
      const image = await this.partialUpdate(id, { bannerbear_url });

      return image;
    } catch (error: unknown) {
      this.loggerService.error("Error in createImage", { error, id, bannerbear_url }, this.constructor.name);

      throw error;
    }
  }
}

export interface MediaDynamoRepositoryInterface {
  get(id: MediaInterface["id"]): Promise<MediaInterface>,
  create(id: MediaInterface["id"], checksum:string, bannerbear_id: string, bannerbear_url?: string): Promise<MediaInterface>
  update(id: MediaInterface["id"], bannerbear_url: string): Promise<MediaInterface>
}

type MediaRepositoryConfigType = Pick<EnvConfigInterface, "tableNames">;
