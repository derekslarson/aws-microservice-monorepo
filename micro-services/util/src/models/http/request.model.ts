import { APIGatewayProxyEventV2 } from "aws-lambda";
import { UserId } from "../../types";

export type Request = Omit<APIGatewayProxyEventV2, "requestContext"> & {
  requestContext: Omit<APIGatewayProxyEventV2["requestContext"], "authorizer"> & {
    authorizer?: Omit<APIGatewayProxyEventV2["requestContext"]["authorizer"], "jwt"> & {
      // This is necessary due to the difference in requestContext.authorizer
      // structure in the responses from http and websocket authorizers
      userId?: UserId;
      scope?: string;
      lambda?: {
        userId: UserId;
        scope: string;
      }
    }
  }
};
