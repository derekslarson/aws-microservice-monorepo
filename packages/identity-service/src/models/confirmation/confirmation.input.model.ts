// eslint-disable-next-line max-classes-per-file
import { Expose } from "@yac/core";
import { IsEmail, IsString, Length } from "class-validator";

export class ConfirmationInputDto {
  @Expose()
  @IsEmail()
  public email: string;

  @Expose()
  @IsString()
  @Length(6, 6)
  public confirmationCode: string;

  @Expose()
  @IsString()
  public session: string;
}
