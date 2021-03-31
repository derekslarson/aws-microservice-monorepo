import { Expose } from "@yac/core";
import { IsEmail } from "class-validator";

export class LoginInputDto {
  @Expose()
  @IsEmail()
  public email: string;
}
