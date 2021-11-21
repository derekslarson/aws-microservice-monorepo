import { Record, Union, String } from "runtypes";
import { Email } from "../runtypes/email.runtype";
import { Phone } from "../runtypes/phone.runtype";

const EmailLogin = Record({
  clientId: String,
  state: String,
  email: Email,
});

const PhoneLogin = Record({
  clientId: String,
  state: String,
  phone: Phone,
});

export const LoginDto = Record({ body: Union(EmailLogin, PhoneLogin) });
