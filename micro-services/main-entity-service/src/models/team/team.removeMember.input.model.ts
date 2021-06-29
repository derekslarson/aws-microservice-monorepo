import { Expose } from "@yac/core";
import { IsString } from "class-validator";

export class TeamRemoveMemberPathParametersDto {
  @Expose()
  @IsString()
  public teamId: string;

  @Expose()
  @IsString()
  public userId: string;
}

export interface TeamRemoveMemberInput {
  teamId: string;
  userId: string;
}
