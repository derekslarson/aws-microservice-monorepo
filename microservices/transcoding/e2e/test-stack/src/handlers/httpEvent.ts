import { DynamoDB } from "aws-sdk";
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import ksuid from "ksuid";

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    console.log("event:\n", event);

    const documentClient = new DynamoDB.DocumentClient();

    const { queryStringParameters, headers, rawPath: path, body: stringifiedBody, requestContext: { http: { method } } } = event

    let body: Record<string, unknown> | string | undefined;

    if (stringifiedBody) {
      try {
        body = JSON.parse(stringifiedBody)
      } catch (error) {
        console.log("Error parsing body:\n", error)

        body = "Malformed JSON"
      }
    }

    await documentClient.put({
      TableName: process.env.TESTING_TABLE_NAME as string,
      Item: {
        pk: `path-${path}`,
        sk: ksuid.randomSync().string,
        method,
        path,
        body,
        queryStringParameters,
        headers
      }
    }).promise();

    return { statusCode: 200 };
  } catch (error: unknown) {
    console.log("Error:\n", error);

    return { statusCode: 200 };
  }
};
