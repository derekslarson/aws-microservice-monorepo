import { Expose } from "@yac/core";
import { IsUrl, IsString, IsArray } from "class-validator";

import { CreateClientRequestBody } from "../../api-contracts/createClient.post";

export class CreateClientInputDto implements CreateClientRequestBody {
  @Expose()
  @IsString()
  public name: string;

  @Expose()
  @IsUrl()
  public redirectUri: string;

  @Expose()
  @IsArray()
  @IsString({ each: true })
  public scopes: string[];
}
