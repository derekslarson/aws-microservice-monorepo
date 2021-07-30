import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export type AuthServiceConfirmMethod = HttpMethod.POST;

export type AuthServiceConfirmPath = "/confirm";

export interface AuthServiceConfirmationRequestBody {
  email: string;
  confirmationCode: string;
  session: string;
  clientId: string;
  redirectUri: string;
}

export interface AuthServiceConfirmationRequestCookies {
  "XSRF-TOKEN": string;
}

export interface AuthServiceConfirmationResponseBody {
  confirmed: boolean;
  session?: string;
  authorizationCode?: string;
}

export type AuthServiceCreateClientMethod = HttpMethod.POST;

export type AuthServiceCreateClientPath = "/oauth2/clients";

export interface AuthServiceCreateClientRequestBody {
  name: string;
  redirectUri: string;
  scopes: string[];
}

export interface AuthServiceCreateClientResponseBody {
  clientId: string;
  clientSecret: string;
}

export type AuthServiceDeleteClientMethod = HttpMethod.DELETE;

export type AuthServiceDeleteClientPath = `/oauth2/clients/${string}`;

export type AuthServiceDeleteClientIdPathParameter = string;

export interface AuthServiceDeleteClientRequestHeaders {
  secret: string;
}

export interface AuthServiceDeleteClientResponseBody {
  message: string;
}

export type AuthServiceLoginMethod = HttpMethod.POST;

export type AuthServiceLoginPath = "/login";

export interface AuthServiceLoginRequestBody {
  email: string;
}

export interface AuthServiceLoginResponseBody {
  session: string;
}

export type AuthServiceOauth2AuthorizeMethod = HttpMethod.GET;

export type AuthServiceOauth2AuthorizePath = "/oauth2/authorize";

export interface AuthServiceOauth2AuthorizeRequestQueryParameters {
  responseType: string;
  clientId: string;
  redirectUri: string;
  state?: string;
  scope?: string[];
}

type GrantType = "authorization_code" | "refresh_token";
type RedirectUri = `https://${string}.${string}`;
type Authorization = `Basic ${string}`;

export type AuthServiceOauth2TokenMethod = HttpMethod.POST;

export type AuthServiceOauth2TokenPath = "/oauth2/token";

export type AuthServiceOauth2TokenRequestBody = `grant_type=${GrantType}&code=${string}&client_id=${string}&redirect_uri=${RedirectUri}&scope=${string}`;

export interface AuthServiceOauth2TokenRequestHeaders {
  "Content-Type": "application/x-www-form-urlencoded";
  Authorization: Authorization;
}

export type AuthServiceSignUpMethod = HttpMethod.POST;

export type AuthServiceSignUpPath = "/sign-up";

export interface AuthServiceSignUpRequestBody {
  email: string;
}

export interface AuthServiceSignUpResponseBody {
  session: string;
}
