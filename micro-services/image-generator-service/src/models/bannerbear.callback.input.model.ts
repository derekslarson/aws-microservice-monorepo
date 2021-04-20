// eslint-disable-next-line max-classes-per-file
import { Expose } from "@yac/core";
import { Contains, IsJSON, IsString, IsUrl } from "class-validator";

import { BannerbearCallbackHeaders, BannerbearCallbackBody } from "../api-contracts/bannerbearCallback.post";

export class BannerbearCallbackHeadersDto implements BannerbearCallbackHeaders {
  @Expose()
  @IsString()
  @Contains("Bearer")
  public authorization: string;
}

export class BannerbearCallbackBodyDto implements BannerbearCallbackBody {
  @Expose()
  @IsString()
  @IsJSON()
  public metadata: string;

  @Expose()
  @IsUrl({ protocols: [ "https" ], host_whitelist: [ /bannerbear.com/ ], require_host: true })
  public image_url: string;
}
