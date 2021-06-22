// eslint-disable-next-line max-classes-per-file
import { Expose } from "@yac/core";
import { IsString } from "class-validator";

export class TeamRemoveMemberPathParametersInputDto {
  @Expose()
  @IsString()
  public teamId: string;
}

export class TeamRemoveMemberBodyInputDto {
  @Expose()
  @IsString()
  public userId: string;
}
