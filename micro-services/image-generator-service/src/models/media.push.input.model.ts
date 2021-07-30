// eslint-disable-next-line max-classes-per-file
import { Expose } from "@yac/util";
import { IsIn, IsString } from "class-validator";

import { MediaPushQueryParameters, MediaPushPathParameters } from "../api-contracts/mediaPush.post";

export class MediaPushQueryParametersDto implements MediaPushQueryParameters {
  @Expose()
  @IsString()
  public token: string;
}

export class MediaPushPathParametersDto implements MediaPushPathParameters {
  @Expose()
  @IsString()
  public messageId: string;

  @Expose()
  @IsIn([ "user", "group" ])
  public folder: "user" | "group";
}
