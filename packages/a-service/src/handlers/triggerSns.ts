import { APIGatewayProxyEvent, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { SNS } from "aws-sdk";
import { TriggerSnsRequestBody, TriggerSnsResponseBody } from "../../../core-service/src/api-contracts/triggerSns.post";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const sns = new SNS();

    const requestBody = JSON.parse(event.body || "{}") as TriggerSnsRequestBody;

    if (!requestBody.message) {
      throw new Error("'message' is required");
    }

    const publishInput: SNS.Types.PublishInput = {
      TopicArn: process.env.MESSAGE_CREATED_TOPIC_ARN,
      Message: requestBody.message,
    };

    const snsPublishResponse = await sns.publish(publishInput).promise();

    if (!snsPublishResponse.MessageId) {
      throw new Error("'MessageId' not returned in publish response");
    }

    const responseBody: TriggerSnsResponseBody = { messageId: snsPublishResponse.MessageId };

    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
  } catch (error: unknown) {
    console.log("error:\n", error);

    return {
      statusCode: 200,
      body: JSON.stringify({ }),
    };
  }
};
