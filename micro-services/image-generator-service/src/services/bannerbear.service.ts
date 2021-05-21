import "reflect-metadata";
import { injectable, inject } from "inversify";
import { HttpRequestServiceInterface, LoggerServiceInterface } from "@yac/core";

import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { MediaInterface } from "../models/media.model";

enum BannerbearTemplates {
  "GIF2VIDEO" = "wXmzGBDajKNbLN7gjn",
  "IMAGE" = "N1qMxz5vvgq5eQ4kor",
}

@injectable()
export class BannerbearService implements BannerbearServiceInterface {
  constructor(
    @inject(TYPES.HttpRequestServiceInterface) private httpService: HttpRequestServiceInterface,
    @inject(TYPES.EnvConfigInterface) private envConfig: BannerbearServiceConfigType,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
  ) { }

  public async pushTask<T extends Task<TaskTypes>>(id: MediaInterface["id"], task: T): Promise<Omit<BannerbearTask, "image_url">> {
    this.loggerService.trace("pushTask called", { task }, this.constructor.name);
    try {
      const data = this.generateRequestData(task, id);
      const request = await this.httpService.post<BannerbearTask>(`https://api.bannerbear.com/v2/${task.type === "IMAGE" ? "images" : "animated_gifs"}`, data, undefined, { Authorization: `Bearer ${this.envConfig.bannerbear_key}` });

      return {
        created_at: request.body.created_at,
        uid: request.body.uid,
        status: request.body.status,
        input_media_url: request.body.input_media_url,
      };
    } catch (error: unknown) {
      this.loggerService.error("pushTask failed", { task, error }, this.constructor.name);
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

  private generateRequestData<T extends Task<TaskTypes>>(task: T, id: MediaInterface["id"]): BannerbearRequestData {
    const modifications = this.generateModifications<T>(task);
    switch (task.type) {
      case "GIF2VIDEO": {
        const taskAux: Task<"GIF2VIDEO"> = task as Task<"GIF2VIDEO">;
        return {
          template: BannerbearTemplates.GIF2VIDEO,
          input_media_url: taskAux.options.source,
          frames: Array.from([ [], [], [] ]).map(() => modifications),
          fps: 1,
          webhook_url: `${this.envConfig.origin}/bannerbear/callback`,
          metadata: JSON.stringify({ id }),
        };
      }

      case "IMAGE": {
        return {
          template: BannerbearTemplates.IMAGE,
          modifications,
          webhook_url: `${this.envConfig.origin}/bannerbear/callback`,
          metadata: JSON.stringify({ id }),
        };
      }

      default: {
        throw new Error(`Invalid task type. Task of type: ${task.type as string} is invalid`);
      }
    }
  }

  private generateModifications<T extends Task<TaskTypes>>(task: T): BannerbearModification[] {
    switch (task.type) {
      case "GIF2VIDEO": {
        const auxTask: Task<"GIF2VIDEO"> = task as Task<"GIF2VIDEO">;
        return [ {
          name: "username",
          text: auxTask.options.templateParameters.username,
        }, auxTask.options.templateParameters.channel ? {
          name: "channel",
          text: auxTask.options.templateParameters.channel,
        } : undefined, {
          name: "subject",
          text: auxTask.options.templateParameters.subject,
        } ].filter(Boolean) as BannerbearModification[];
      }
      case "IMAGE": {
        const auxTask: Task<"IMAGE"> = task as Task<"IMAGE">;
        return [ {
          name: "username",
          text: auxTask.options.templateParameters.username,
        }, task.options.templateParameters.channel ? {
          name: "channel",
          text: auxTask.options.templateParameters.channel,
        } : undefined, auxTask.options.templateParameters.subject ? {
          name: "subject",
          text: auxTask.options.templateParameters.subject,
        } : undefined, {
          name: "user_image",
          image_url: auxTask.options.templateParameters.user_image,
        } ].filter(Boolean) as BannerbearModification[];
      }

      default: {
        throw new Error(`Invalid task type. Task of type: ${task.type as string} is invalid`);
      }
    }
  }
}

type BannerbearServiceConfigType = Pick<EnvConfigInterface, "origin" | "bannerbear_key">;

interface BannerbearTemplateVideoParameters {
  username: `@${string}`,
  channel?: `#${string}`,
  subject?: string
}

interface BannerbearTemplateImageParameters {
  username: `@${string}`,
  user_image: string,
  channel?: `#${string}`,
  subject?: string
}

interface BannerbearVideoToGifTaskOptions extends BannerbearTaskParameters {
  source: string,
  templateParameters: BannerbearTemplateVideoParameters
}

interface BannerbearImageTaskOptions extends BannerbearTaskParameters {
  templateParameters: BannerbearTemplateImageParameters
}

interface BannerbearTaskParameters {
  templateParameters: Record<string, any>
}

interface BannerbearTask {
  created_at: string;
  uid: string;
  status: string;
  input_media_url: string;
  image_url?: string;
  metadata?: string;
}

interface TaskOptions {
  "GIF2VIDEO": BannerbearVideoToGifTaskOptions
  "IMAGE": BannerbearImageTaskOptions
}

export interface Task<T extends TaskTypes> {
  options: TaskOptions[T]
  type: T
}

interface BannerbearModification {
  name: string,
  text?: string,
  image_url?: string
}

interface BannerbearRequestDataMeta {
  template: BannerbearTemplates
  webhook_url: string
  metadata?: string
}

interface BannerbearImageRequestData extends BannerbearRequestDataMeta {
  modifications: BannerbearModification[]
}
interface BannerbearVideoToGifRequestData extends BannerbearRequestDataMeta {
  input_media_url: string
  frames: Array<BannerbearModification[]>
  fps: 1
}

type BannerbearRequestData = BannerbearVideoToGifRequestData | BannerbearImageRequestData;

export type TaskTypes = "GIF2VIDEO" | "IMAGE";

export interface BannerbearServiceInterface {
  pushTask<T extends Task<TaskTypes>>(id: MediaInterface["id"], options: T): Promise<Omit<BannerbearTask, "image_url">>,
  getTask(id: string): Promise<BannerbearTask>
}
