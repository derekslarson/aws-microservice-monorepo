import { Record, String } from "runtypes";

export const InitiateGoogleAccessFlowDto = Record({
  pathParameters: Record({ userId: String }),
  queryStringParameters: Record({ redirectUri: String }),
});
