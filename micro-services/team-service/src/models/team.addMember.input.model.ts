// eslint-disable-next-line max-classes-per-file
import { Expose } from "@yac/core";
import { IsString } from "class-validator";

export class TeamAddMemberPathParametersInputDto {
  @Expose()
  @IsString()
  public teamId: string;
}

export class TeamAddMemberBodyInputDto {
  @Expose()
  @IsString()
  public userId: string;
}
