import { AuthServiceCreateClientRequestBody, Expose } from "@yac/util";
import { IsUrl, IsString, IsArray } from "class-validator";

export class CreateClientInputDto implements AuthServiceCreateClientRequestBody {
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
