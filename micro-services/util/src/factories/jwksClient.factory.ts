import jwksRsa from "jwks-rsa";

export type JwksClient = jwksRsa.JwksClient;

export type JwksClientFactory = (jwksUri: string) => JwksClient;

export const jwksClientFactory: JwksClientFactory = (jwksUri: string) => jwksRsa({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
  jwksUri,
});
