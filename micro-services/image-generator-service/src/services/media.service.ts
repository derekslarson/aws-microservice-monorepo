import "reflect-metadata";
import { LoggerServiceInterface } from "@yac/core";
import { injectable, inject } from "inversify";
import * as crypto from "crypto";

import { MediaInterface } from "../models/media.model";
import { TYPES } from "../inversion-of-control/types";
import { MediaDynamoRepositoryInterface } from "../repositories/media.dynamo.repository";
import { BannerbearServiceInterface, Task, TaskTypes } from "./bannerbear.service";
import { YacLegacyApiServiceInterface, YacMessage } from "./yacLegacyApi.service";

@injectable()
export class MediaService implements MediaServiceInterface {
  constructor(@inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.MediaDynamoRepositoryInterface) private mediaRepository: MediaDynamoRepositoryInterface,
    @inject(TYPES.YacLegacyApiServiceInterface) private yacApiService: YacLegacyApiServiceInterface,
    @inject(TYPES.BannerbearServiceInterface) private bannerbearService: BannerbearServiceInterface) { }

  public async createMedia(messageId: string, isGroup: boolean, token: string): Promise<{ id: string }> {
    try {
      this.loggerService.trace("createMedia called", { messageId, isGroup, token }, this.constructor.name);
      const yacMessage = await this.yacApiService.getMessage(messageId, isGroup, token);

      const task = yacMessage.type === "AUDIO" ? this.generateTask<"IMAGE">("IMAGE", yacMessage, isGroup) : this.generateTask<"GIF2VIDEO">("GIF2VIDEO", yacMessage, isGroup);
      const bannerbearRequest = await this.bannerbearService.pushTask(this.derivePrimaryKey(messageId, isGroup), task);

      const messageChecksumData: MediaChecksumInterface = {
        senderUsername: yacMessage.usernameFrom,
        senderRealName: yacMessage.profileNameFrom,
        senderImage: yacMessage.profileImageFrom,
      };
      const databaseEntry = await this.mediaRepository.create(this.derivePrimaryKey(messageId, isGroup), this.getChecksum(messageChecksumData), bannerbearRequest.uid);

      return { id: databaseEntry.id };
    } catch (error: unknown) {
      this.loggerService.error("createMedia failed to execute", { error, messageId, isGroup, token }, this.constructor.name);
      throw error;
    }
  }

  public async getMedia(messageId: string, isGroup: boolean, token: string): Promise<{ url: string }> {
    try {
      this.loggerService.trace("getMedia called", { messageId, isGroup, token }, this.constructor.name);
      const databaseEntry = await this.mediaRepository.get(this.derivePrimaryKey(messageId, isGroup));
      if (!databaseEntry.bannerbear_url) {
        // media is not ready yet. return the placeholder then
        return { url: "https://yac-resources.s3.amazonaws.com/mediaplayer_thumb.png" };
      }

      return { url: databaseEntry.bannerbear_url };
    } catch (error: unknown) {
      this.loggerService.error("getMedia failed to execute", { messageId, isGroup, token, error }, this.constructor.name);
      throw error;
    }
  }

  public async updateMedia(id: MediaInterface["id"], bannerbear_url: string): Promise<void> {
    try {
      this.loggerService.trace("updateMedia called", { id, bannerbear_url }, this.constructor.name);
      await this.mediaRepository.update(id, bannerbear_url);
    } catch (error: unknown) {
      this.loggerService.error("updateMedia failed to execute", { id, bannerbear_url, error }, this.constructor.name);
      throw error;
    }
  }

  private getChecksum(data: MediaChecksumInterface): string {
    const encodedData = Buffer.from(JSON.stringify(data)).toString("base64");
    const hash = crypto.createHash("sha256");

    return hash.update(encodedData).digest("hex");
  }

  private derivePrimaryKey(messageId: string, isGroup: boolean): MediaInterface["id"] {
    const accessor = isGroup ? "GROUP" : "USER";
    return `${accessor}-${messageId}` as MediaInterface["id"];
  }

  private generateTask<T extends TaskTypes>(type: T, yacMessage: YacMessage, isGroup: boolean): Task<TaskTypes> {
    switch (type) {
      case "GIF2VIDEO": {
        const options: Task<"GIF2VIDEO">["options"] = {
          source: yacMessage.fileName,
          templateParameters: {
            username: `@${yacMessage.usernameFrom}` as `@${string}`,
            channel: isGroup ? `#${yacMessage.profileNameTo}` as `#${string}` : undefined,
            subject: yacMessage.subject && yacMessage.subject.length >= 30 ? `${yacMessage.subject.slice(0, 30)}...` : yacMessage.subject || undefined,
          },
        };

        return {
          type,
          options,
        };
      }

      case "IMAGE": {
        const options: Task<"IMAGE">["options"] = {
          templateParameters: {
            username: `@${yacMessage.usernameFrom}` as `@${string}`,
            channel: isGroup ? `#${yacMessage.profileNameTo}` as `#${string}` : undefined,
            subject: yacMessage.subject && yacMessage.subject.length >= 30 ? `${yacMessage.subject.slice(0, 30)}...` : yacMessage.subject || undefined,
            user_image: yacMessage.profileImageFrom,
          },
        };

        return {
          type,
          options,
        };
      }
      default: {
        throw new Error("");
      }
    }
  }
}
// all the data thats prone to change is part of the MediaChecksum
interface MediaChecksumInterface {
  senderUsername: string,
  senderImage: string,
  senderRealName: string
}

export interface MediaServiceInterface {
  // Get the message data from yac api
  // start the process of generating the gif from the message fileName
  // generate the id with derivePrimaryKey function
  // create entry on the db with the use of the MediaDynamoRepository(use the result from the derivePrimaryKey function)
  createMedia(messageId: string, isGroup: boolean, token: string): Promise<{ id: string }>
  // query the MediaDynamoRepository for the image(use the derivePrimaryKey function to get the id)
  // return bannearbear_url
  getMedia(messageId: string, isGroup: boolean, token: string): Promise<{ url: string }>
  // use the bannerbear webhooks api
  // just call the MediaDynamoRepository update function
  // returns void
  updateMedia(id: MediaInterface["id"], bannerbear_url: string): Promise<void>
}
