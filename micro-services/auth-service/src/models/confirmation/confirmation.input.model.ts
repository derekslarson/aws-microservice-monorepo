// eslint-disable-next-line max-classes-per-file
import { Expose } from "@yac/core";
import { IsEmail, IsString, IsUrl, Length } from "class-validator";

import { ConfirmationRequestBody, ConfirmationRequestCookies } from "../../api-contracts/confirm.get";

export class ConfirmationRequestBodyDto implements ConfirmationRequestBody {
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
}

export class ConfirmationRequestCookiesDto implements ConfirmationRequestCookies {
  @Expose()
  @IsString()
  public "XSRF-TOKEN": string;
}

export interface ConfirmationInput extends ConfirmationRequestBodyDto {
  xsrfToken: ConfirmationRequestCookiesDto["XSRF-TOKEN"]
}
