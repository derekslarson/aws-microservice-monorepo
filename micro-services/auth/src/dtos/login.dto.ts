import { Record, Union } from "runtypes";
import { Email } from "../runtypes/email.runtype";
import { Phone } from "../runtypes/phone.runtype";

const EmailLogin = Record({ email: Email });
const PhoneLogin = Record({ phone: Phone });
export const LoginDto = Record({ body: Union(EmailLogin, PhoneLogin) });
