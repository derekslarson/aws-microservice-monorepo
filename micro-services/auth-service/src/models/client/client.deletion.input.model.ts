import { AuthServiceDeleteClientRequestHeaders, Expose } from "@yac/util";
import { IsString } from "class-validator";

export class DeleteClientInputDto implements AuthServiceDeleteClientRequestHeaders {
  @Expose()
  @IsString()
  public secret: string;
}
