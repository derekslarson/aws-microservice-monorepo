import { ConfirmationRequestBody, Expose } from "@yac/core";
import { IsEmail, IsString, IsUrl, Length } from "class-validator";

export class ConfirmationInputDto implements ConfirmationRequestBody {
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

  @Expose()
  @IsString()
  public clientId: string;

  @Expose()
  @IsUrl()
  public redirectUri: string;

  @Expose()
  @IsString()
  public xsrfToken: string;
}
