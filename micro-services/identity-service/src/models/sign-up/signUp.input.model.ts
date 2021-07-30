import { Expose } from "@yac/util";
import { IsEmail } from "class-validator";

export class SignUpInputDto {
  @Expose()
  @IsEmail()
  public email: string;
}
