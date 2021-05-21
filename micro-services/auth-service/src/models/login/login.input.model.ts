import { Expose, AuthServiceLoginRequestBody } from "@yac/core";
import { IsEmail } from "class-validator";

export class LoginInputDto implements AuthServiceLoginRequestBody {
  @Expose()
  @IsEmail()
  public email: string;
}
