import { Record } from "runtypes";
import { Email } from "../runtypes/email.runtype";

export const CreateUserDto = Record({ body: Record({ email: Email }) });
