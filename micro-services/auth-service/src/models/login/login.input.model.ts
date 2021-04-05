import { Expose } from "@yac/core";
import { IsEmail } from "class-validator";

import { LoginRequestBody } from "../../api-contracts/login.post";

export class LoginInputDto implements LoginRequestBody {
  @Expose()
  @IsEmail()
  public email: string;
}
