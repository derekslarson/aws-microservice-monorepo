import { Record, Optional, Array, String, Literal, Union } from "runtypes";
import { RedirectUri } from "../runtypes/redirectUri.runtype";

export const AuthorizeDto = Record({
  queryStringParameters: Record({
    client_id: String,
    response_type: Union(Literal("code"), Literal("token")),
    redirect_uri: RedirectUri,
    state: Optional(String),
    code_challenge_method: Optional(Literal("S256")),
    code_challenge: Optional(String),
    scope: Optional(Array(String)),
  }),
});
