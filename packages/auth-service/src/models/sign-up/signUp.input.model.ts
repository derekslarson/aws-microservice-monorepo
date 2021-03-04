import { Expose, SignUpRequestBody } from "@yac/core";
import { IsEmail } from "class-validator";

export class SignUpInputDto implements SignUpRequestBody {
  @Expose()
  @IsEmail()
  public email: string;
}
