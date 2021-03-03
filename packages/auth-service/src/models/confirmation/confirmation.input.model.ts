import { ConfirmationRequestQueryParameters, Expose } from "@yac/core";
import { IsEmail, IsString, Length } from "class-validator";

export class ConfirmationInputDto implements ConfirmationRequestQueryParameters {
  @Expose()
  @IsEmail()
  public email: string;

  @Expose()
  @IsString()
  @Length(6, 6)
  public confirmationCode: string;
}
