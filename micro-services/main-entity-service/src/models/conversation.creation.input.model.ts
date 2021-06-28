import { ConversationType, Expose } from "@yac/core";
import { IsEnum, IsString } from "class-validator";

export class ConversationCreationBodyInputDto {
  @Expose()
  @IsString()
  public name: string;

  @Expose()
  @IsEnum(ConversationType)
  public conversationType: ConversationType;
}
