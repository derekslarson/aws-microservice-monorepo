import { Record, Optional, String, Union } from "runtypes";

export const GetTokenDto = Record({
  headers: Record({ authorization: Optional(String) }),
  body: Record({
    client_id: Optional(String),
    grant_type: Optional(Union(String)),
    redirect_uri: Optional(String),
    code: Optional(String),
    code_verifier: Optional(String),
    refresh_token: Optional(String),
  }),
});
