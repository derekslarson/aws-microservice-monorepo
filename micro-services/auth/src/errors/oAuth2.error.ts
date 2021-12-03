import { BaseError } from "@yac/util";
import { OAuth2ErrorType } from "../enums/oAuth2ErrorType.enum";

export class OAuth2Error extends BaseError {
  public error: OAuth2ErrorType;

  public errorDescription?: string;

  public redirectUri?: string;

  constructor(oAuth2ErrorType: OAuth2ErrorType, message?: string, redirectUri?: string, state?: string) {
    super(message || oAuth2ErrorType);
    this.error = oAuth2ErrorType;
    this.errorDescription = message;

    if (redirectUri) {
      this.redirectUri = `${redirectUri}?error=${oAuth2ErrorType}${message ? `&error_description=${encodeURIComponent(message)}` : ""}${state ? `&state=${state}` : ""}`;
    }
  }
}
