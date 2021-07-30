import "reflect-metadata";
import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Request, Response, ValidationServiceInterface, RequestPortion, BaseController } from "@yac/util";

import { TYPES } from "../inversion-of-control/types";
import { MediaServiceInterface } from "../services/media.service";
import { MediaPushPathParametersDto, MediaPushQueryParametersDto } from "../models/media.push.input.model";
import { MediaRetrievePathParametersDto, MediaRetrieveQueryParametersDto } from "../models/media.retrieve.input.model";

@injectable()
export class MediaController extends BaseController implements MediaControllerInterface {
  constructor(
    @inject(TYPES.MediaServiceInterface) private mediaService: MediaServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ValidationServiceInterface) private validationService: ValidationServiceInterface,
  ) {
    super();
  }

  public async pushMedia(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("pushMedia called", { request }, this.constructor.name);
      const queryParametersInput = await this.validationService.validate(MediaPushQueryParametersDto, RequestPortion.QueryParameters, request.queryStringParameters);
      const pathParametersInput = await this.validationService.validate(MediaPushPathParametersDto, RequestPortion.PathParameters, request.pathParameters);
      const { messageId, folder } = pathParametersInput;
      const isGroup = folder === "group";

      const responseBody = await this.mediaService.createMedia(messageId, isGroup, queryParametersInput.token);

      return this.generateSuccessResponse(responseBody);
    } catch (error: unknown) {
      this.loggerService.error("Error in pushMedia", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async retrieveMedia(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("retrieveMedia called", { request }, this.constructor.name);
      const queryParametersInput = await this.validationService.validate(MediaRetrieveQueryParametersDto, RequestPortion.QueryParameters, request.queryStringParameters);
      const pathParametersInput = await this.validationService.validate(MediaRetrievePathParametersDto, RequestPortion.PathParameters, request.pathParameters);
      const { messageId, folder } = pathParametersInput;
      const isGroup = folder === "group";

      const responseBody = await this.mediaService.getMedia(messageId, isGroup, queryParametersInput.token);

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
