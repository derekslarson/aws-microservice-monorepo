import { Record, String, Number } from "runtypes";

const MessageChunkUploadBodyDto = Record({ data: String, chunkNumber: Number });
const MessageChunkUploadPathDto = Record({ messageId: String });

export const MessageChunkUploadDto = Record({ body: MessageChunkUploadBodyDto, pathParameters: MessageChunkUploadPathDto });
