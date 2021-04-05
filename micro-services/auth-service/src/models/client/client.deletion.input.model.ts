import { Expose } from "@yac/core";
import { IsString } from "class-validator";

import { DeleteClientRequestHeaders } from "../../api-contracts/deleteClient.delete";

export class DeleteClientInputDto implements DeleteClientRequestHeaders {
  @Expose()
  @IsString()
  public secret: string;
}
