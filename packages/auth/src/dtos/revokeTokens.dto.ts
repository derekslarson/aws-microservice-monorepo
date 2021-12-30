import { Record, String } from "runtypes";

export const RevokeTokensDto = Record({
  body: Record({
    client_id: String,
    token: String,
  }),
});
