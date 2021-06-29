/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Expose } from "@yac/core";
import { IsString } from "class-validator";

export class TeamsGetByUserIdPathParametersDto {
  @Expose()
  @IsString()
  userId: string;
}
