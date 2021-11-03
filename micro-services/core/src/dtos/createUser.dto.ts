import { Optional, Union, String, Record } from "runtypes";
import { Email } from "../runtypes/email.runtype";
import { Phone } from "../runtypes/phone.runtype";

const PhoneOptional = Record({
  email: Email,
  username: String,
  realName: String,
  phone: Optional(Phone),
  bio: Optional(String),
});

const EmailOptional = Record({
  phone: Phone,
  username: String,
  realName: String,
  email: Optional(Email),
  bio: Optional(String),
});

export const CreateUserDto = Record({ body: Union(PhoneOptional, EmailOptional) });
