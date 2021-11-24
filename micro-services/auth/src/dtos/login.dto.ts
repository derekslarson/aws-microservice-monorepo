import { Record, Union, String, Array } from "runtypes";
import { Email } from "../runtypes/email.runtype";
import { Phone } from "../runtypes/phone.runtype";

const baseProps = { clientId: String };

const EmailLogin = Record({
  ...baseProps,
  email: Email,
});

const PhoneLogin = Record({
  ...baseProps,
  phone: Phone,
});

export const LoginDto = Record({
  cookies: Array(String),
  body: Union(EmailLogin, PhoneLogin),
});
