import { Expose, SignUpRequestBody } from "@yac/core";
import { IsEmail, IsNumber, IsString } from "class-validator";

export class SignUpInputDto implements SignUpRequestBody {
  @Expose()
  @IsEmail()
  public email: string;

  @Expose()
  @IsString()
  public name: string;

  @Expose()
  @IsNumber()
  public age: number;
}
