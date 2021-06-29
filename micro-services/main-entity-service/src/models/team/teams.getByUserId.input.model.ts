// eslint-disable-next-line max-classes-per-file
import { Expose } from "@yac/core";
import { IsString } from "class-validator";

export class TeamsGetByUserIdPathParametersInputDto {
  @Expose()
  @IsString()
  public userId: string;
}
