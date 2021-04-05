import { Expose } from "@yac/core";
import { IsEmail } from "class-validator";

import { SignUpRequestBody } from "../../api-contracts/signUp.post";

export class SignUpInputDto implements SignUpRequestBody {
  @Expose()
  @IsEmail()
  public email: string;
}
