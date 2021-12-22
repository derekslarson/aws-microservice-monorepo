import { Record } from "runtypes";
import { ImageMimeType } from "../runtypes/image.mimeType.runtype";
import { OrganizationId } from "../runtypes/organizationId.runtype";

export const GetOrganizationImageUploadUrlDto = Record({
  pathParameters: Record({ organizationId: OrganizationId }),
  queryStringParameters: Record({ mime_type: ImageMimeType }),
});
