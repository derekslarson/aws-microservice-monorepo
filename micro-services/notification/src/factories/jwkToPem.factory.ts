import jwkToPem, { JWK } from "jwk-to-pem";

export type Jwk = JWK & { kid: string; };

export type JwkToPem = typeof jwkToPem;

export type JwkToPemFactory = () => JwkToPem;

export const jwkToPemFactory: JwkToPemFactory = () => jwkToPem;
