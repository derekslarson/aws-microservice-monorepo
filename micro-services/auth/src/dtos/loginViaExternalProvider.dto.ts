import { Array, Record, Literal, String, Union } from "runtypes";
import { ExternalProvider } from "../enums/externalProvider.enum";

export const LoginViaExternalProviderDto = Record({
  cookies: Array(String),
  queryStringParameters: Record({ external_provider: Union(Literal(ExternalProvider.Google), Literal(ExternalProvider.Slack)) }),
});
