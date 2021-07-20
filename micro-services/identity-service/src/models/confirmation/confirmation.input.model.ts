// eslint-disable-next-line max-classes-per-file
import { Expose } from "@yac/core";
import { IsEmail, IsOptional, IsPhoneNumber, IsString, Length } from "class-validator";

export class ConfirmationInputDto {
  @Expose()
  @IsEmail()
  @IsOptional()
  public email: string;

  @Expose()
  @IsPhoneNumber("ZZ")
  @IsOptional()
  public phone: string;

  @Expose()
  @IsString()
  @Length(6, 6)
  public confirmationCode: string;

  @Expose()
  @IsString()
  public session: string;
}
