import "reflect-metadata";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { generateInternalServerErrorResponse, StatusCode } from "@yac/core";

// eslint-disable-next-line @typescript-eslint/require-await
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    console.log("Event:\n", event);

    return {
      statusCode: StatusCode.OK,
      body: JSON.stringify({ clientId: process.env.USER_POOL_CLIENT_ID, clientSecret: process.env.USER_POOL_CLIENT_SECRET }),
    };
  } catch (error: unknown) {
    console.log("Error in signUp handler:\n", error);

    return generateInternalServerErrorResponse(error);
  }
};
