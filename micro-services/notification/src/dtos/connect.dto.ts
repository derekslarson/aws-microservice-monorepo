import { Record, String } from "runtypes";

export const ConnectDto = Record({
  headers: Record({ token: String }),
  requestContext: Record({ connectionId: String }),
});
