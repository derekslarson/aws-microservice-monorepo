import "reflect-metadata";
import { inject, injectable } from "inversify";
import { BaseController } from "@yac/util/src/controllers/base.controller";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { ValidationServiceV2Interface } from "@yac/util/src/services/validation.service.v2";
import { Request } from "@yac/util/src/models/http/request.model";
import { Response } from "@yac/util/src/models/http/response.model";
import { TYPES } from "../inversion-of-control/types";
import { MediaServiceInterface } from "../services/media.service";
import { PushMediaDto } from "../dtos/pushMedia.dto";
import { RetrieveMediaDto } from "../dtos/retrieveMedia.dto";

@injectable()
export class MediaController extends BaseController implements MediaControllerInterface {
  constructor(
    @inject(TYPES.MediaServiceInterface) private mediaService: MediaServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
  ) {
    super();
  }

  public async pushMedia(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("pushMedia called", { request }, this.constructor.name);

      const {
        pathParameters: { messageId, folder },
        queryStringParameters: { token },
      } = this.validationService.validate({ dto: PushMediaDto, request });

      const isGroup = folder === "group";

      const responseBody = await this.mediaService.createMedia(messageId, isGroup, token);

      return this.generateSuccessResponse(responseBody);
    } catch (error: unknown) {
      this.loggerService.error("Error in pushMedia", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async retrieveMedia(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("retrieveMedia called", { request }, this.constructor.name);
      const {
        pathParameters: { messageId, folder },
        queryStringParameters: { token },
      } = this.validationService.validate({ dto: RetrieveMediaDto, request });

      const isGroup = folder === "group";

      const responseBody = await this.mediaService.getMedia(messageId, isGroup, token);

      return this.generateFoundResponse(responseBody.url);
    } catch (error: unknown) {
      this.loggerService.error("Error in retrieveMedia", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface MediaControllerInterface {
  pushMedia(request: Request): Promise<Response>
  retrieveMedia(request: Request): Promise<Response>
}
