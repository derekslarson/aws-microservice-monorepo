import { Record, Union, Array, String, Literal } from "runtypes";
import { ClientType } from "../enums/clientType.enum";
import { RedirectUri } from "../runtypes/redirectUri.runtype";

export const CreateClientDto = Record({
  body: Record({
    name: String,
    redirectUri: RedirectUri,
    type: Union(Literal(ClientType.Public), Literal(ClientType.Private)),
    scopes: Array(String),
  }),
});
