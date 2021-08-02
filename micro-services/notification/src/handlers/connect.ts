import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    await Promise.resolve();
    console.log("event:\n", event);

    return { statusCode: 200 };
  } catch (error: unknown) {
    console.log("error:\n", error);

    return { statusCode: 500 };
  }
};
