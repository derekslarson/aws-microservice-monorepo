/* eslint-disable max-classes-per-file */
import { Record, Union, String, Array, Optional, Literal } from "runtypes";
import { Email } from "../runtypes/email.runtype";
import { Phone } from "../runtypes/phone.runtype";
import { RedirectUri } from "../runtypes/redirectUri.runtype";

const baseProps = {
  confirmationCode: String,
  session: String,
  clientId: String,
  redirectUri: RedirectUri,
  state: String,
  codeChallengeMethod: Optional(Literal("S256")),
  codeChallenge: Optional(String),
  scope: Optional(String),
};

const EmailConfirmBody = Record({
  email: Email,
  ...baseProps,
});

const PhoneConfirmBody = Record({
  phone: Phone,
  ...baseProps,
});

export const ConfirmDto = Record({
  cookies: Array(String),
  body: Union(EmailConfirmBody, PhoneConfirmBody),
});
