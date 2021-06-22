import { Expose } from "@yac/core";
import { IsString } from "class-validator";

export class TeamCreationBodyInputDto {
  @Expose()
  @IsString()
  public name: string;
}
