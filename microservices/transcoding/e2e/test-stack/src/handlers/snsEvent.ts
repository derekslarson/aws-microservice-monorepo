import { SNSEvent } from "aws-lambda";
import { DynamoDB } from "aws-sdk";

export const handler = async (event: SNSEvent): Promise<void> => {
  try {
    console.log("event.Records[0]?.Sns:\n", event.Records[0]?.Sns)

    const documentClient = new DynamoDB.DocumentClient();

    await documentClient.put({
      TableName: process.env.TESTING_TABLE_NAME as string,
      Item: {
        pk: `topic-${event.Records[0]?.Sns.TopicArn}`,
        sk: event.Records[0]?.Sns.MessageId,
        topicArn: event.Records[0]?.Sns.TopicArn,
        message: JSON.parse(event.Records[0]?.Sns.Message)
      }
    }).promise()
  } catch (error: unknown) {
    console.log("Error:\n", error);
  }
};
