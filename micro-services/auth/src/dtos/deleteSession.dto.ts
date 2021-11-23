import { Record, String } from "runtypes";

export const DeleteSessionDto = Record({
  body: Record({
    client_id: String,
    token: String,
  }),
});
