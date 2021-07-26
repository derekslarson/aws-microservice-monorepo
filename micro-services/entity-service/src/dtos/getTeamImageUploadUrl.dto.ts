import { Record } from "runtypes";
import { ImageMimeType } from "../runtypes/image.mimeType.runtype";
import { TeamId } from "../runtypes/teamId.runtype";

export const GetTeamImageUploadUrlDto = Record({
  pathParameters: Record({ teamId: TeamId }),
  queryStringParameters: Record({ mime_type: ImageMimeType }),
});
