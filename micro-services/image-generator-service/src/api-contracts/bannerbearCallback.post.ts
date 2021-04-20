import { HttpMethod } from "@aws-cdk/aws-apigatewayv2";

export type BannerbearCallbackMethod = HttpMethod.POST;

export type BannerbearCallbackEndpoint = "/bannerbear/callback";

export interface BannerbearCallbackHeaders{
  authorization: string
}
