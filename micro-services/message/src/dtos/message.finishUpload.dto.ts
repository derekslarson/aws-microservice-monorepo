import { Literal, Record, String, Union, Number } from "runtypes";
import { MessageMimeType } from "@yac/util";

const MessageFinishUploadBodyDto = Record({ checksum: String, totalChunks: Number });
const MessageFinishUploadPathDto = Record({ messageId: String });

// TODO: change for Derek's solution that should come from @yac/util
const MessageFinishUploadQueryDto = Record({
  format: Union(
    Literal(MessageMimeType.AudioMp3),
    Literal(MessageMimeType.AudioMp4),
    Literal(MessageMimeType.VideoMp4),
    Literal(MessageMimeType.VideoWebm),
  ),
});

export const MessageFinishUploadDto = Record({
  body: MessageFinishUploadBodyDto,
  queryStringParameters: MessageFinishUploadQueryDto,
  pathParameters: MessageFinishUploadPathDto,
});
