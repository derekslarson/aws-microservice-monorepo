import { Record } from "runtypes";
import { ImageMimeType } from "../runtypes/image.mimeType.runtype";
import { MeetingId } from "../runtypes/meetingId.runtype";

export const GetMeetingImageUploadUrlDto = Record({
  pathParameters: Record({ meetingId: MeetingId }),
  queryStringParameters: Record({ mime_type: ImageMimeType }),
});
