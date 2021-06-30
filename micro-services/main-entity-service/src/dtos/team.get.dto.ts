/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Expose } from "@yac/core";
import { IsString } from "class-validator";

export class TeamGetPathParametersDto {
  @Expose()
  @IsString()
  teamId: string;
}
