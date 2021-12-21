import { Record, String } from "runtypes";
import { UserIdRuntype } from "@yac/util";

export const InitiateGoogleAccessFlowDto = Record({
  pathParameters: Record({ userId: UserIdRuntype }),
  queryStringParameters: Record({ redirectUri: String }),
});
