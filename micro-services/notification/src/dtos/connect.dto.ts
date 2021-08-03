import { Record, String } from "runtypes";
import { UserId } from "../runtypes/userId.runtype";

export const ConnectDto = Record({
  queryStringParameters: Record({ userId: UserId }),
  requestContext: Record({ connectionId: String }),
});
