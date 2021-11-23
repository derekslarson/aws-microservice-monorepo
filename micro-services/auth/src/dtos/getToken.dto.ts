import { Record, Optional, String, Literal, Union } from "runtypes";
import { GrantType } from "../enums/grantType.enum";
import { RedirectUri } from "../runtypes/redirectUri.runtype";

export const GetTokenDto = Record({
  body: Record({
    client_id: String,
    grant_type: Union(Literal(GrantType.AuthorizationCode), Literal(GrantType.RefreshToken)),
    redirect_uri: Optional(RedirectUri),
    code: Optional(String),
    code_verifier: Optional(String),
    refresh_token: Optional(String),
  }),
});
