import { Expose, SignUpRequestBody } from "@yac/core";
import { IsEmail, IsString } from "class-validator";

export class SignUpInputDto implements SignUpRequestBody {
  @Expose()
  @IsEmail()
  public email: string;

  @Expose()
  @IsString()
  public clientId: string;
}
