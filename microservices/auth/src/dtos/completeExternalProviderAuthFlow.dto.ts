import { Array, Record, String } from "runtypes";

export const CompleteExternalProviderAuthFlowDto = Record({
  cookies: Array(String),
  queryStringParameters: Record({
    code: String,
    state: String,
  }),
});
