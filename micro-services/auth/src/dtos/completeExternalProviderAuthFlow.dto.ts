import { Record, String } from "runtypes";

export const CompleteExternalProviderAuthFlowDto = Record({
  queryStringParameters: Record({
    code: String,
    state: String,
  }),
});
