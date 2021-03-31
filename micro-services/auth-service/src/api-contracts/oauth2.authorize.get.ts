import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export type Oauth2AuthorizeMethod = HttpMethod.GET;

export type Oauth2AuthorizePath = "/oauth2/authorize";

export interface Oauth2AuthorizeRequestQueryParameters {
  responseType: string;
  clientId: string;
  redirectUri: string;
  state?: string;
  scope?: string[];
}
