// eslint-disable-next-line max-classes-per-file
import { Expose } from "@yac/core";
import { IsString } from "class-validator";

export class UsersGetByTeamIdPathParametersInputDto {
  @Expose()
  @IsString()
  public teamId: string;
}
