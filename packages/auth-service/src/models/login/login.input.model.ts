import { Expose } from "class-transformer";
import { IsEmail } from "class-validator";

export interface LoginInput {
  email: string;
}

export class LoginInputDto implements LoginInput {
  @Expose()
  @IsEmail()
  public email: string;
}
