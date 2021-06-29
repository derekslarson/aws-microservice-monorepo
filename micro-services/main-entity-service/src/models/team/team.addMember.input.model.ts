/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Expose, Role } from "@yac/core";
import { IsString, IsEnum } from "class-validator";

export class TeamAddMemberPathParametersDto {
  @Expose()
  @IsString()
  teamId: string;
}

export class TeamAddMemberBodyDto {
  @Expose()
  @IsString()
  userId: string;

  @Expose()
  @IsEnum(Role)
  role: Role;
}

export interface TeamAddMemberInput {
  teamId: string;
  userId: string;
  role: Role;
}
