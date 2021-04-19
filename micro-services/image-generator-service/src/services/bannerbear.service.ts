import "reflect-metadata";
import { injectable, inject } from "inversify";
import { HttpRequestServiceInterface, LoggerServiceInterface } from "@yac/core";

import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";

@injectable()
export class BannerbearService implements BannerbearServiceInterface {
  constructor(
    @inject(TYPES.HttpRequestServiceInterface) private httpService: HttpRequestServiceInterface,
    @inject(TYPES.EnvConfigInterface) private envConfig: BannerbearServiceConfigType,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) {}

  public async pushTask(options: BannerbearVideoToGifTaskOptions): Promise<BannerbearTask> {
    this.loggerService.trace("pushTask called", { options }, this.constructor.name);
    const data = {
      template: "wXmzGBDajKNbLN7gjn",
      modifications: [ {
        name: "username",
        text: options.templateParameters.username,
      }, options.templateParameters.channel ? {
        name: "channel",
        text: options.templateParameters.channel,
      } : {}, {
        name: "subject",
        text: options.templateParameters.subject,
      } ],
      fps: 1,
      webhook_url: `${this.envConfig.origin}/bannerbear/webhook`,
    };
    try {
      const request = await this.httpService.post<BannerbearTask>("https://api.bannerbear.com/v2/animated_gifs", data, undefined, { Authorization: `Bearer ${this.envConfig.bannerbear_key}` });

      return {
        created_at: request.body.created_at,
        uid: request.body.uid,
        status: request.body.status,
        input_media_url: request.body.input_media_url,
      };
    } catch (error: unknown) {
      this.loggerService.error("pushTask failed", { options, error }, this.constructor.name);
      throw new Error("Something went wrong");
    }
  }

  public async getTask(id: string): Promise<BannerbearTask> {
    this.loggerService.trace("getTask called", { id }, this.constructor.name);
    try {
      const request = await this.httpService.get<BannerbearTask>(`https://api.bannerbear.com/v2/animated_gifs/${id}`, undefined, { Authorization: `Bearer ${this.envConfig.bannerbear_key}` });
      return {
        created_at: request.body.created_at,
        uid: request.body.uid,
        status: request.body.status,
        input_media_url: request.body.input_media_url,
        image_url: request.body.image_url,
      };
    } catch (error: unknown) {
      this.loggerService.error("getTask failed", { id, error }, this.constructor.name);
      throw new Error("Something went wrong.");
    }
  }
}

type BannerbearServiceConfigType = Pick<EnvConfigInterface, "origin" | "bannerbear_key">;

interface BannerbearTemplateVideoParameters {
  username: `@${string}`,
  channel?: `#${string}`,
  subject: string
}

interface BannerbearVideoToGifTaskOptions {
  source: string,
  templateParameters: BannerbearTemplateVideoParameters
}

interface BannerbearTask {
  created_at: string;
  uid: string;
  status: string;
  input_media_url: string;
  image_url?: string;
  metadata?: string;
}

export interface BannerbearServiceInterface {
  pushTask(options: BannerbearVideoToGifTaskOptions): Promise<Omit<BannerbearTask, "image_url">>,
  getTask(id: string): Promise<BannerbearTask>
}
