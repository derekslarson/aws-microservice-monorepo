/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Expose } from "@yac/core";
import { IsString } from "class-validator";

export class ConversationRemoveUserPathParametersDto {
  @Expose()
  @IsString()
  conversationId: string;

  @Expose()
  @IsString()
  userId: string;
}
