import { Record, Optional, String, Literal, Union } from "runtypes";
import { RedirectUri } from "../runtypes/redirectUri.runtype";

export const AuthorizeDto = Record({
  queryStringParameters: Record({
    client_id: String,
    response_type: Union(Literal("code"), Literal("token")),
    redirect_uri: RedirectUri,
    state: String,
    code_challenge_method: Optional(Literal("S256")),
    code_challenge: Optional(String),
    scope: Optional(String),
    identity_provider: Optional(Union(Literal("Google"), Literal("Slack"))),
  }),
});
