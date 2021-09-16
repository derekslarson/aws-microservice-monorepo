import { Record, String, BigInt } from "runtypes";

export const MessageChunkBodyDto = Record({ data: String, chunkNumber: BigInt });
