import { Record, String } from "runtypes";

export const DeleteClientDto = Record({
  pathParameters: Record({ clientId: String }),
  headers: Record({ "client-secret": String }),
});
