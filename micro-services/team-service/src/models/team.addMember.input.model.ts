// eslint-disable-next-line max-classes-per-file
import { Expose } from "@yac/core";
import { IsString, IsEnum } from "class-validator";
import { Role } from "../enums/role.enum";

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
