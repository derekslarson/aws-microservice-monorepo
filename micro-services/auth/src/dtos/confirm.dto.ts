/* eslint-disable max-classes-per-file */
import { Record, Union, String, Array } from "runtypes";
import { Email } from "../runtypes/email.runtype";
import { Phone } from "../runtypes/phone.runtype";

const baseProps = {
  confirmationCode: String,
  clientId: String,
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
