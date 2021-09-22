import "reflect-metadata";
import { inject, injectable } from "inversify";
import { BaseController, Request, Response, LoggerServiceInterface, ValidationServiceV2Interface, Message, MessageMimeType } from "@yac/util";

import { TYPES } from "../inversion-of-control/types";
import { MessageServiceInterface } from "../services/message.service";
import { MessageChunkUploadDto } from "../models/message.chunkUpload.dto";
import { MessageFinishUploadDto } from "../models/message.finishUpload.dto";

@injectable()
export class MessagesController extends BaseController implements MessagesControllerInterface {
  constructor(
    @inject(TYPES.LoggerServiceInterface) private loggerService: LoggerServiceInterface,
    @inject(TYPES.ValidationServiceV2Interface) private validationService: ValidationServiceV2Interface,
    @inject(TYPES.MessagesService) private messageService: MessageServiceInterface,
  ) {
    super();
  }

  public async chunkUpload(request: Request): Promise<Response> {
    this.loggerService.trace("called processChunk ", { request }, this.constructor.name);

    try {
      const {
        pathParameters: { messageId },
        body: { chunkNumber, data },
      } = this.validationService.validate({ dto: MessageChunkUploadDto, request });

      try {
        await this.messageService.processChunk({
          chunkData: data,
          messageId: messageId as Message["id"],
          chunkNumber,
        });

        const response: ChunkUploadResponse = {
          success: true,
          data: {
            messageId,
            chunkNumber,
            chunkData: data,
          },
        };
        return this.generateSuccessResponse(response);
      } catch (error: unknown) {
        this.loggerService.error("failed to append chunk to this file", { error, request: { messageId, chunkNumber, data } }, this.constructor.name);
        const errorResponse: ChunkUploadResponse = {
          success: false,
          data: {
            messageId,
            chunkNumber,
            chunkData: data,
          },
        };

        return this.generateAcceptedResponse(errorResponse);
      }
    } catch (error: unknown) {
      this.loggerService.error("failed to chunkUpload", { error, request }, this.constructor.name);

      return this.generateErrorResponse(error);
    }
  }

  public async finishUpload(request: Request): Promise<Response> {
    this.loggerService.trace("called finishUpload ", { request }, this.constructor.name);

    try {
      const {
        pathParameters: { messageId },
        body: { checksum, totalChunks },
        queryStringParameters: { format },
      } = this.validationService.validate({ dto: MessageFinishUploadDto, request });

      const file = await this.messageService.saveMessage({
        checksum,
        messageId: messageId as Message["id"],
        contentType: format as MessageMimeType,
        totalChunks,
      });

      const response: FinishUploadResponse = { url: file.url };

      return this.generateSuccessResponse(response);
    } catch (error: unknown) {
      this.loggerService.error("failed to finishUpload", { error, request }, this.constructor.name);

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
  url: string
}
