import { SNSEvent } from "aws-lambda";

// eslint-disable-next-line @typescript-eslint/require-await
export const handler = async (event: SNSEvent): Promise<void> => {
  try {
    console.log("event:\n", JSON.stringify(event, null, 2));
  } catch (error: unknown) {
    console.log("error:\n", error);
  }
};
