/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Expose } from "@yac/core";
import { IsString } from "class-validator";

export class DmConversationCreationPathParametersDto {
  @Expose()
  @IsString()
  userId: string;
}

export class DmConversationCreationBodyDto {
  // other user's id
  @Expose()
  @IsString()
  userId: string;
}

export interface DmConversationCreationInput {
  userId: string;
  friendId: string;
}
