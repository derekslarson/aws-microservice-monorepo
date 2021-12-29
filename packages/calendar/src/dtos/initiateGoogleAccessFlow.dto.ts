import { Record, String } from "runtypes";
import { UserIdRuntype } from "@yac/util/src/runtypes/userId.runtype";

export const InitiateGoogleAccessFlowDto = Record({
  pathParameters: Record({ userId: UserIdRuntype }),
  queryStringParameters: Record({ redirectUri: String }),
});
