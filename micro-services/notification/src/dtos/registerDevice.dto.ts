import { Record, String } from "runtypes";

export const RegisterDeviceDto = Record({
  pathParameters: Record({ userId: String }),
  body: Record({ id: String, token: String }),
});
