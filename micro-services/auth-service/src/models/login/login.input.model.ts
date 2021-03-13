import { Expose, LoginRequestBody } from "@yac/core";
import { IsEmail, IsString } from "class-validator";

export class LoginInputDto implements LoginRequestBody {
  @Expose()
  @IsEmail()
  public email: string;

  @Expose()
  @IsString()
  public clientId: string;
}
