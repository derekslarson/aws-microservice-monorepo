import { Expose } from "@yac/util";
import { IsEmail, IsOptional, IsPhoneNumber } from "class-validator";

export class LoginInputDto {
  @Expose()
  @IsEmail()
  @IsOptional()
  public email: string;

  @Expose()
  @IsPhoneNumber("ZZ")
  @IsOptional()
  public phone: string;
}
