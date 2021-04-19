// eslint-disable-next-line max-classes-per-file
import { Expose } from "@yac/core";
import { IsIn, IsString } from "class-validator";

import { MediaRetrievePathParameters, MediaRetrieveQueryParameters } from "../api-contracts/mediaRetrieve.get";

export class MediaRetrieveQueryParametersDto implements MediaRetrieveQueryParameters {
  @Expose()
  @IsString()
  public token: string;
}

export class MediaRetrievePathParametersDto implements MediaRetrievePathParameters {
  @Expose()
  @IsString()
  public messageId: string;

  @Expose()
  @IsIn([ "user", "group" ])
  public folder: "user" | "group";
}
