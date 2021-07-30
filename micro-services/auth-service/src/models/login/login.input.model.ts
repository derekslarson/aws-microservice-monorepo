import { Expose, AuthServiceLoginRequestBody } from "@yac/util";
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
