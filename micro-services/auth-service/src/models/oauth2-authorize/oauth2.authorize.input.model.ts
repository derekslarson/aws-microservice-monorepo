import { Expose, Oauth2AuthorizeRequestQueryParameters } from "@yac/core";
import { IsArray, IsOptional, IsString, IsUrl } from "class-validator";

export class Oauth2AuthorizeInputDto implements Oauth2AuthorizeRequestQueryParameters {
  @Expose()
  @IsString()
  public clientId: string;

  @Expose()
  @IsString()
  public responseType: string;

  @Expose()
  @IsUrl()
  public redirectUri: string;

  @Expose()
  @IsString()
  @IsOptional()
  public state?: string;

  @Expose()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  public scope?: string[];
}
