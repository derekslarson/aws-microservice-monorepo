import "reflect-metadata";
import { LoggerServiceInterface } from "@yac/core";
import { injectable, inject } from "inversify";

import { MediaInterface } from "../models/media.model";
import { TYPES } from "../inversion-of-control/types";
import { MediaDynamoRepositoryInterface } from "../repositories/media.dynamo.repository";
import { BannerbearServiceInterface } from "./bannerbear.service";

@injectable()
export class MediaService implements MediaServiceInterface {
  constructor(@inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MediaDynamoRepositoryInterface) private mediaRepository: MediaDynamoRepositoryInterface,
    @inject(TYPES.BannerbearServiceInterface) private bannerbearService: BannerbearServiceInterface) {

  }

  public async createMedia(messageId: string, isGroup: boolean): Promise<{id: string}> {
    try {
      this.loggerService.trace("createMedia called", { messageId, isGroup }, this.constructor.name);
      // const bannerbearRequest = await this.bannerbearService.pushTask({
      //   source: 
      // });
    } catch (error: unknown) {
      this.loggerService.error("createMedia failed to execute", { messageId, isGroup }, this.constructor.name);
    }
  }

  private derivePrimaryKey(messageId: string, isGroup: boolean): MediaInterface["id"] {
    const accessor = isGroup ? "GROUP" : "USER";
    return `${accessor}-${messageId}`;
  }
}

export interface MediaServiceInterface {
  // Get the message data from yac api
  // start the process of generating the gif from the message fileName
  // generate the id with derivePrimaryKey function
  // create entry on the db with the use of the ImageDynamoRepository(use the result from the derivePrimaryKey function)
  createMedia(messageId: string, isGroup: boolean, token: string): Promise<{id: string}>
  // query the ImageDynamoRepository for the image(use the derivePrimaryKey function to get the id)
  // return bannearbear_url
  getMedia(messageId: string, isGroup: boolean, token: string): Promise<{url: string}>
  // use the bannerbear webhooks api
  // just call the ImageDynamoRepository update function
  // returns void
  updateMedia(messageId: string, isGroup: boolean): Promise<void>
}
