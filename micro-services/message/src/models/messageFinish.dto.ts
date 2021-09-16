import { Literal, Record, String, Union } from "runtypes";
import { MessageMimeType } from "@yac/util";

export const MessageFinishBodyDto = Record({ checksum: String });
// TODO: change for Derek's solution that should come from @yac/util
export const MessageFinishQueryDto = Record({
  format: Union(
    Literal(MessageMimeType.AudioMp3),
    Literal(MessageMimeType.AudioMp4),
    Literal(MessageMimeType.VideoMp4),
    Literal(MessageMimeType.VideoWebm),
  ),
});
