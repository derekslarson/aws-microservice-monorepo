import { Record, Optional, String, Literal, Union } from "runtypes";
import { RedirectUri } from "../runtypes/redirectUri.runtype";

export const GetTokenDto = Record({
  body: Record({
    client_id: String,
    grant_type: Union(Literal("authorization_code"), Literal("refresh_token")),
    redirect_uri: RedirectUri,
    code: String,
    code_verifier: Optional(String),
    scope: Optional(String),
  }),
});
