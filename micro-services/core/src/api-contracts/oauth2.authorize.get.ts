import * as ApiGatewayV2 from "@aws-cdk/aws-apigatewayv2";

export const oauth2AuthorizeMethod = ApiGatewayV2.HttpMethod.GET;

export const oauth2AuthorizePath = "/oauth2/authorize";

export interface Oauth2AuthorizeRequestQueryParameters {
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string[];
}
