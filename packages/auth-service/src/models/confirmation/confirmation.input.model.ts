import { Expose } from "class-transformer";
import { IsEmail, IsString, Length } from "class-validator";

export interface ConfirmationInput {
  email: string;
  confirmationCode: string;
}

export class ConfirmationInputDto implements ConfirmationInput {
  @Expose()
  @IsEmail()
  public email: string;

  @Expose()
  @IsString()
  @Length(6, 6)
  public confirmationCode: string;
}
