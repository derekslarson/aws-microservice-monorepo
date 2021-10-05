import { Record, String, Number } from "runtypes";

export const MessageChunkUploadDto = Record({ body: Record({ data: String, chunkNumber: Number }) });
