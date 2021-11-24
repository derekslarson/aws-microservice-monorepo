import { Record, Optional, String, Literal, Union } from "runtypes";
import { ExternalProvider } from "../enums/externalProvider.enum";
import { RedirectUri } from "../runtypes/redirectUri.runtype";

export const BeginAuthFlowDto = Record({
  queryStringParameters: Record({
    client_id: String,
    response_type: Union(Literal("code"), Literal("token")),
    redirect_uri: RedirectUri,
    state: Optional(String),
    code_challenge_method: Optional(Literal("S256")),
    code_challenge: Optional(String),
    scope: Optional(String),
    external_provider: Optional(Union(Literal(ExternalProvider.Google), Literal(ExternalProvider.Slack))),
  }),
});
