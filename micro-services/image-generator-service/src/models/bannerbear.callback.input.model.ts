// eslint-disable-next-line max-classes-per-file
import { Expose } from "@yac/core";
import { Contains, IsString } from "class-validator";

import { BannerbearCallbackHeaders } from "../api-contracts/bannerbearCallback.post";

export class BannerbearCallbackHeadersDto implements BannerbearCallbackHeaders {
  @Expose()
  @IsString()
  @Contains("Bearer")
  public authorization: string;
}
