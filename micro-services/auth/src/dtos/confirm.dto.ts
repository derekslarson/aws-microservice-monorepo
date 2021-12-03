/* eslint-disable max-classes-per-file */
import { Record, String, Array } from "runtypes";

export const ConfirmDto = Record({
  cookies: Array(String),
  body: Record({ confirmationCode: String }),
});
