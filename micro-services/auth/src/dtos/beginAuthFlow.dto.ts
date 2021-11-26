import { Record, Optional, String } from "runtypes";

// We need to make every param optional and simply a string, because the OAuth2 spec requires
// a specific error response that runtypes doesn't return. We will manually validate each param
// in the controller and throw the appropriate error format
export const BeginAuthFlowDto = Record({
  queryStringParameters: Record({
    client_id: Optional(String),
    response_type: Optional(String),
    redirect_uri: Optional(String),
    state: Optional(String),
    code_challenge_method: Optional(String),
    code_challenge: Optional(String),
    scope: Optional(String),
    external_provider: Optional(String),
  }),
});
