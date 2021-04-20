import "reflect-metadata";
import { inject, injectable } from "inversify";
import { LoggerServiceInterface, Request, Response, ValidationServiceInterface, RequestPortion, BaseController, BadRequestError } from "@yac/core";

import { TYPES } from "../inversion-of-control/types";
import { MediaServiceInterface } from "../services/media.service";
import { BannerbearCallbackHeadersDto } from "../models/bannerbear.callback.input.model";
import { MediaInterface } from "../models/media.model";

@injectable()
export class BannerbearController extends BaseController implements BannerbearControllerInterface {
  constructor(
    @inject(TYPES.MediaServiceInterface) private mediaService: MediaServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ValidationServiceInterface) private validationService: ValidationServiceInterface,
  ) {
    super();
  }

  public async callback(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("callback called", { request }, this.constructor.name);

      await this.validationService.validate(BannerbearCallbackHeadersDto, RequestPortion.Headers, request.headers);

      if (!request.body) {
        throw new BadRequestError();
      }

      const body = JSON.parse(request.body) as Record<string, string>;
      const metadata = JSON.parse(body.metadata) as {id: MediaInterface["id"]};

      await this.mediaService.updateMedia(metadata.id, body.image_url);

      return this.generateSuccessResponse({ message: "Succesfully completed the request. Media is now updated" });
    } catch (error: unknown) {
      this.loggerService.error("Error in callback", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface BannerbearControllerInterface {
  callback(request: Request): Promise<Response>
}
