/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Expose } from "@yac/core";
import { IsString } from "class-validator";

export class ChannelConversationCreationPathParametersDto {
  @Expose()
  @IsString()
  userId: string;
}

export class ChannelConversationCreationBodyDto {
  @Expose()
  @IsString()
  name: string;
}

export interface ChannelConversationCreationInput {
  name: string;
  createdBy: string;
}
