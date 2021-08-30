/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MessageTranscodedSnsMessage } from "@yac/util";
import { backoff, sns, transcribe } from "../../../../e2e/util";
import { uploadTestMessageFileIfNecessary } from "../util";

describe("Start Transcription Job", () => {
  const environment = process.env.environment as string;
  const messageTranscodedSnsTopicArn = process.env["message-transcoded-sns-topic-arn"] as string;
  const mockConversationId = "mock-conversation-id";
  const mockMessageId = "mock-message-id";
  const fileExtension = "mp3";
  const jobName = `${environment}_${mockMessageId}`;

  describe("when a message is published to the message transcoded SNS topic", () => {
    beforeAll(async () => {
      await uploadTestMessageFileIfNecessary({ conversationId: mockConversationId, messageId: mockMessageId });
    });

    fit("starts a transcription job", async () => {
      try {
        const message: MessageTranscodedSnsMessage = {
          key: `${mockConversationId}/${mockMessageId}.${fileExtension}`,
          messageId: mockMessageId as `message-${string}`,
          newMimeType: "audio/mpeg" as MessageTranscodedSnsMessage["newMimeType"],
        };

        await sns.publish({
          TopicArn: messageTranscodedSnsTopicArn,
          Message: JSON.stringify(message),
        }).promise();

        const { TranscriptionJob } = await backoff(
          () => transcribe.getTranscriptionJob({ TranscriptionJobName: jobName }).promise(),
          (response) => !!response.TranscriptionJob,
        );

        expect(TranscriptionJob).toBeDefined();
        expect([ "QUEUED", "IN_PROGRESS" ]).toContain(TranscriptionJob?.TranscriptionJobStatus as string);
      } catch (error) {
        fail(error);
      }
    }, 60000);
  });
});
