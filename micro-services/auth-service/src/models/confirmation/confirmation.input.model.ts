// eslint-disable-next-line max-classes-per-file
import { Expose, AuthServiceConfirmationRequestBody, AuthServiceConfirmationRequestCookies } from "@yac/util";
import { IsEmail, IsOptional, IsPhoneNumber, IsString, IsUrl, Length } from "class-validator";

export class ConfirmationRequestBodyDto implements AuthServiceConfirmationRequestBody {
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

  @Expose()
  @IsString()
  public clientId: string;

  @Expose()
  @IsUrl()
  public redirectUri: string;
}

export class ConfirmationRequestCookiesDto implements AuthServiceConfirmationRequestCookies {
  @Expose()
  @IsString()
  public "XSRF-TOKEN": string;
}

export interface ConfirmationInput extends ConfirmationRequestBodyDto {
  xsrfToken: ConfirmationRequestCookiesDto["XSRF-TOKEN"]
}
