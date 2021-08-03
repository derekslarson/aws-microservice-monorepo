import { Record, String } from "runtypes";

export const ConnectDto = Record({
  queryStringParameters: Record({ token: String }),
  requestContext: Record({ connectionId: String }),
});
