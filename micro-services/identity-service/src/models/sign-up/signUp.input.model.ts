import { Expose } from "@yac/core";
import { IsEmail } from "class-validator";

export class SignUpInputDto {
  @Expose()
  @IsEmail()
  public email: string;
}
