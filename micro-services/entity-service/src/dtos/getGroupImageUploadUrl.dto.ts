import { Record } from "runtypes";
import { GroupId } from "../runtypes/groupId.runtype";
import { ImageMimeType } from "../runtypes/image.mimeType.runtype";

export const GetGroupImageUploadUrlDto = Record({
  pathParameters: Record({ groupId: GroupId }),
  queryStringParameters: Record({ mime_type: ImageMimeType }),
});
