import "reflect-metadata";
import { injectable, inject } from "inversify";
import { BaseDynamoRepository, IdServiceInterface, DocumentClientFactory, LoggerServiceInterface, NotFoundError } from "@yac/core";

import { EnvConfigInterface } from "../config/env.config";
import { TYPES } from "../inversion-of-control/types";
import { ImageInterface } from "../models/image.model";

@injectable()
export class ImageDynamoRepository extends BaseDynamoRepository<ImageInterface> implements ImageDynamoRepositoryInterface {
  constructor(
  @inject(TYPES.DocumentClientFactory) documentClientFactory: DocumentClientFactory,
    @inject(TYPES.IdServiceInterface) idService: IdServiceInterface,
    @inject(TYPES.LoggerServiceInterface) loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) envConfig: ImageRepositoryConfigType,
  ) {
    super(envConfig.tableNames.IMAGES, documentClientFactory, idService, loggerService);
  }

  public async getImage(messageId: string, isGroup: boolean): Promise<ImageInterface> {
    try {
      this.loggerService.trace("getImage called", { messageId, isGroup }, this.constructor.name);

      const id = this.derivePrimaryKey(messageId, isGroup);
      const image = await this.getByPrimaryKey(id);

      return image;
    } catch (error: unknown) {
      this.loggerService.error("Error in getImage", { error, messageId, isGroup }, this.constructor.name);

      if (error instanceof NotFoundError) {
        throw new NotFoundError(`Image with id ${isGroup ? "GROUP" : "USER9y"}-${messageId} not found.`);
      }

      throw error;
    }
  }

  public async createImage(messageId: string, isGroup: boolean, bannerbear_id: string, bannerbear_url?: string): Promise<ImageInterface> {
    try {
      this.loggerService.trace("createImage called", { messageId, isGroup, bannerbear_id, bannerbear_url }, this.constructor.name);
      const id = this.derivePrimaryKey(messageId, isGroup);
      const image = await this.insertWithIdIncluded({
        id,
        bannerbear_id,
        bannerbear_url,
        createdAt: String(Date.now()),
        updatedAt: String(Date.now()),
      });

      return image;
    } catch (error: unknown) {
      this.loggerService.error("Error in createImage", { error, messageId, isGroup, bannerbear_id, bannerbear_url }, this.constructor.name);

      throw error;
    }
  }

  public async updateImage(messageId: string, isGroup: boolean, bannerbear_url: string): Promise<ImageInterface> {
    try {
      this.loggerService.trace("createImage called", { messageId, isGroup, bannerbear_url }, this.constructor.name);
      const id = this.derivePrimaryKey(messageId, isGroup);
      const image = await this.partialUpdate(id, { bannerbear_url });

      return image;
    } catch (error: unknown) {
      this.loggerService.error("Error in createImage", { error, messageId, isGroup, bannerbear_url }, this.constructor.name);

      throw error;
    }
  }

  private derivePrimaryKey(messageId: string, isGroup: boolean): ImageInterface["id"] {
    const accessor = isGroup ? "GROUP" : "USER";
    return `${accessor}-${messageId}`;
  }
}

interface ImageDynamoRepositoryInterface {
  getImage(messageId: string, isGroup: boolean): Promise<ImageInterface>,
  createImage(messageId: string, isGroup: boolean, bannerbear_id: string, bannerbear_url?: string): Promise<ImageInterface>
  updateImage(messageId:string, isGroup: boolean, bannerbear_url: string): Promise<ImageInterface>
}

type ImageRepositoryConfigType = Pick<EnvConfigInterface, "tableNames">;
