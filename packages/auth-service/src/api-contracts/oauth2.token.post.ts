import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

type GrantType = "authorization_code" | "refresh_token";
type RedirectUri = `https://${string}.${string}`;
type Authorization = `Basic ${string}`;

export type Oauth2TokenMethod = HttpMethod.POST;

export type Oauth2TokenPath = "/oauth2/token";

export type Oauth2TokenRequestBody = `grant_type=${GrantType}&code=${string}&client_id=${string}&redirect_uri=${RedirectUri}&scope=${string}`;

export interface Oauth2TokenRequestHeaders {
  "Content-Type": "application/x-www-form-urlencoded";
  Authorization: Authorization;
}
