import { Expose } from "@yac/core";
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
