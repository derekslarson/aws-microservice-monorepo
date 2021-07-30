import { Expose, AuthServiceSignUpRequestBody } from "@yac/util";
import { IsEmail } from "class-validator";

export class SignUpInputDto implements AuthServiceSignUpRequestBody {
  @Expose()
  @IsEmail()
  public email: string;
}
