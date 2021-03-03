import { Expose, LoginRequestBody } from "@yac/core";
import { IsEmail } from "class-validator";

export class LoginInputDto implements LoginRequestBody {
  @Expose()
  @IsEmail()
  public email: string;
}
