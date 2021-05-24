import { AuthServiceDeleteClientRequestHeaders, Expose } from "@yac/core";
import { IsString } from "class-validator";

export class DeleteClientInputDto implements AuthServiceDeleteClientRequestHeaders {
  @Expose()
  @IsString()
  public secret: string;
}
