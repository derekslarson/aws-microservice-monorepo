/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Expose, Role } from "@yac/core";
import { IsString, IsEnum } from "class-validator";

export class TeamAddUserPathParametersDto {
  @Expose()
  @IsString()
  teamId: string;
}

export class TeamAddUserBodyDto {
  @Expose()
  @IsString()
  userId: string;

  @Expose()
  @IsEnum(Role)
  role: Role;
}
