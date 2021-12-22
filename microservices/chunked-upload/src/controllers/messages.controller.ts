import "reflect-metadata";
import { inject, injectable } from "inversify";
import { BaseController } from "@yac/util/src/controllers/base.controller";
import { ValidationServiceV2Interface } from "@yac/util/src/services/validation.service.v2";
import { LoggerServiceInterface } from "@yac/util/src/services/logger.service";
import { MessageUploadTokenServiceInterface } from "@yac/util/src/services/messageUploadToken.service";
import { Request } from "@yac/util/src/models/http/request.model";
import { Response } from "@yac/util/src/models/http/response.model";
import { UnauthorizedError } from "@yac/util/src/errors/unauthorized.error";
import { TYPES } from "../inversion-of-control/types";
import { MessageServiceInterface } from "../services/message.service";
import { MessageChunkUploadDto } from "../dtos/message.chunkUpload.dto";
import { MessageFinishUploadDto } from "../dtos/message.finishUpload.dto";

@injectable()
export class MessagesController extends BaseController implements MessagesControllerInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.MessageUploadTokenServiceInterface) private messageUploadTokenService: MessageUploadTokenServiceInterface,
    @inject(TYPES.MessagesServiceInterface) private messageService: MessageServiceInterface,
  ) {
    super();
  }

  public async chunkUpload(request: Request): Promise<Response> {
    this.loggerService.trace("chunkUpload called", { request }, this.constructor.name);

    try {
      if (!request.headers.authorization) {
        throw new UnauthorizedError("Unauthorized");
      }

      const { decodedToken: { conversationId, messageId } } = await this.messageUploadTokenService.verifyToken({ token: request.headers.authorization.replace("Bearer ", "") });
      const { body: { chunkNumber, data: chunkData } } = this.validationService.validate({ dto: MessageChunkUploadDto, request });

      try {
        await this.messageService.processChunk({
          conversationId,
          messageId,
          chunkData,
          chunkNumber,
        });

        const response: ChunkUploadResponse = {
          success: true,
          data: {
            messageId,
            chunkNumber,
            chunkData,
          },
        };
        return this.generateCreatedResponse(response);
      } catch (error: unknown) {
        this.loggerService.error("error in chunkUpload: Error in append chunk to this file", { error, request: { messageId, chunkNumber, data: chunkData } }, this.constructor.name);
        const errorResponse: ChunkUploadResponse = {
          success: false,
          data: {
            messageId,
            chunkNumber,
            chunkData,
          },
        };

        return this.generateSuccessResponse(errorResponse);
      }
    } catch (error: unknown) {
      this.loggerService.error("error in chunkUpload", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async finishUpload(request: Request): Promise<Response> {
    this.loggerService.trace("finishUpload called", { request }, this.constructor.name);

    try {
      if (!request.headers.authorization) {
        throw new UnauthorizedError("Unauthorized");
      }

      const { decodedToken: { conversationId, messageId, mimeType } } = await this.messageUploadTokenService.verifyToken({ token: request.headers.authorization.replace("Bearer ", "") });
      const { body: { checksum, totalChunks } } = this.validationService.validate({ dto: MessageFinishUploadDto, request });

      await this.messageService.saveMessage({
        conversationId,
        messageId,
        mimeType,
        checksum,
        totalChunks,
      });

      const response: FinishUploadResponse = { message: "Upload finished." };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("Error in finishUpload", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }
}

export interface MessagesControllerInterface {
  chunkUpload(request: Request): Promise<Response>
  finishUpload(request: Request): Promise<Response>
}

interface ChunkUploadResponse {
  success: boolean,
  data: {
    chunkData: string,
    chunkNumber: number,
    messageId: string
  }
}

interface FinishUploadResponse {
  message: "Upload finished."
}
