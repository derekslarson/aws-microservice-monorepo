import { APIGatewayProxyEventV2 } from "aws-lambda";
import { UserId } from "../../types";

export type Request = Omit<APIGatewayProxyEventV2, "requestContext"> & {
  requestContext: Omit<APIGatewayProxyEventV2["requestContext"], "authorizer"> & {
    authorizer?: Omit<APIGatewayProxyEventV2["requestContext"]["authorizer"], "jwt"> & {
      lambda?: {
        userId: UserId;
        scopes: string[];
      }
    }
  }
};
