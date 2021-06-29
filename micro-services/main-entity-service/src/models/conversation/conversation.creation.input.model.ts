import { Expose } from "@yac/core";
import { IsEnum, IsString } from "class-validator";
import { ConversationType } from "../../enums/conversationType.enum";

export class ConversationCreationBodyInputDto {
  @Expose()
  @IsString()
  public name: string;

  @Expose()
  @IsEnum(ConversationType)
  public conversationType: ConversationType;
}
