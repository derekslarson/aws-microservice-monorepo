import { Expose, DeleteClientRequestHeaders } from "@yac/core";
import { IsString } from "class-validator";

export class DeleteClientInputDto implements DeleteClientRequestHeaders {
  @Expose()
  @IsString()
  public secret: string;
}
