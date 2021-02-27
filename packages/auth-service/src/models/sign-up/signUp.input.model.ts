import { Expose } from "class-transformer";
import { IsEmail } from "class-validator";

export interface SignUpInput {
  email: string;
}

export class SignUpInputDto implements SignUpInput {
  @Expose()
  @IsEmail()
  public email: string;
}
