// eslint-disable-next-line max-classes-per-file
import { Expose, Role } from "@yac/core";
import { IsString, IsEnum } from "class-validator";

export class TeamAddMemberPathParametersInputDto {
  @Expose()
  @IsString()
  public teamId: string;
}

export class TeamAddMemberBodyInputDto {
  @Expose()
  @IsString()
  public userId: string;

  @Expose()
  @IsEnum(Role)
  public role: Role;
}
