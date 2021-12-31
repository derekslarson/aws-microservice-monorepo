import { Record, String, Number } from "runtypes";

export const MessageFinishUploadDto = Record({ body: Record({ checksum: String, totalChunks: Number }) });
