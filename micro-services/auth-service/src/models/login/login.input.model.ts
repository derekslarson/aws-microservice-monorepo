import { Expose, AuthServiceLoginRequestBody } from "@yac/core";
import { IsEmail, IsPhoneNumber, IsOptional } from "class-validator";

export class LoginInputDto implements AuthServiceLoginRequestBody {
  @Expose()
  @IsEmail()
  @IsOptional()
  public email: string;

  @Expose()
  @IsPhoneNumber("ZZ")
  @IsOptional()
  public phone: string;
}
