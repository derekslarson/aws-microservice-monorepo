/* eslint-disable max-classes-per-file */
import { Record, Union, String, Array } from "runtypes";
import { Email } from "../runtypes/email.runtype";
import { Phone } from "../runtypes/phone.runtype";
import { RedirectUri } from "../runtypes/redirectUri.runtype";

// eslint-disable-next-line max-classes-per-file

const baseProps = {
  confirmationCode: String,
  session: String,
  clientId: String,
  redirectUri: RedirectUri,
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
