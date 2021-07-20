import { Optional, Record } from "runtypes";
import { Email } from "../runtypes/email.runtype";
import { Phone } from "../runtypes/phone.runtype";

export const CreateUserDto = Record({
  body: Record({
    email: Optional(Email),
    phone: Optional(Phone),
  }),
});
