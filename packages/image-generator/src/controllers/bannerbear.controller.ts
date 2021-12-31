import "reflect-metadata";
import { inject, injectable } from "inversify";
import { BaseController } from "@yac/util/src/controllers/base.controller";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { ValidationServiceV2Interface } from "@yac/util/src/services/validation.service.v2";
import { Request } from "@yac/util/src/models/http/request.model";
import { Response } from "@yac/util/src/models/http/response.model";
import { UnauthorizedError } from "@yac/util/src/errors/unauthorized.error";
import { BadRequestError } from "@yac/util/src/errors/badRequest.error";
import { TYPES } from "../inversion-of-control/types";
import { EnvConfigInterface } from "../config/env.config";
import { MediaServiceInterface } from "../services/media.service";
import { BannerbearCallbackDto } from "../dtos/bannerbearCallback.dto";
import { MediaInterface } from "../models/media.model";

@injectable()
export class BannerbearController extends BaseController implements BannerbearControllerInterface {
  constructor(
    @inject(TYPES.MediaServiceInterface) private mediaService: MediaServiceInterface,
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.EnvConfigInterface) private envConfig: BannerbearControllerEnvConfigType,
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
  ) {
    super();
  }

  public async callback(request: Request): Promise<Response> {
    try {
      this.loggerService.trace("callback called", { request }, this.constructor.name);

      const {
        headers: { authorization },
        body: { metadata: metadataJson, image_url: imageUrl },
      } = this.validationService.validate({ dto: BannerbearCallbackDto, request });

      if (!authorization.includes(`Bearer ${this.envConfig.bannerbear_webhook_key}`)) {
        throw new UnauthorizedError();
      }

      let metadata: { id: MediaInterface["id"]; };
      try {
        metadata = JSON.parse(metadataJson) as { id: MediaInterface["id"]; };
      } catch (error: unknown) {
        throw new BadRequestError("metadata field is not JSON");
      }

      if (!/^(USER|GROUP)-([0-9]+)$/g.exec(metadata.id)) {
        throw new BadRequestError("metadata.id is invalid");
      }

      await this.mediaService.updateMedia(metadata.id, imageUrl);

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

type BannerbearControllerEnvConfigType = Pick<EnvConfigInterface, "bannerbear_webhook_key">;
