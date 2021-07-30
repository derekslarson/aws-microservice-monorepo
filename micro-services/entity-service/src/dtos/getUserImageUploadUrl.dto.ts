import { Record } from "runtypes";
import { ImageMimeType } from "../runtypes/image.mimeType.runtype";
import { UserId } from "../runtypes/userId.runtype";

export const GetUserImageUploadUrlDto = Record({
  pathParameters: Record({ userId: UserId }),
  queryStringParameters: Record({ mime_type: ImageMimeType }),
});
