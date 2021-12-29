/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { readFileSync } from "fs";
import { MessageTranscodedSnsMessage } from "@yac/util";
import { backoff, s3 } from "../../../../e2e/util";
import { deleteSnsEventsByTopicArn, getSnsEventsByTopicArn } from "../util";

describe("Transcoding Job Complete", () => {
  const messageTranscodedSnsTopicArn = process.env["message-transcoded-sns-topic-arn"] as string;
  const enhancedMessageS3BucketName = process.env["enhanced-message-s3-bucket-name"] as string;

  describe("when a file is uploaded to the enhanced message S3 bucket", () => {
    beforeEach(async () => {
      await deleteSnsEventsByTopicArn({ topicArn: messageTranscodedSnsTopicArn });
    });

    it("publishes a message to the Message Transcoded SNS topic", async () => {
      try {
        const mockConversationId = "mock-conversation-id";
        const mockMessageId = "mock-message-id";

        const file = readFileSync(`${process.cwd()}/e2e/test-enhanced-message.mp3`);

        await s3.upload({
          Bucket: enhancedMessageS3BucketName,
          Key: `${mockConversationId}/${mockMessageId}.mp3`,
          Body: file,
        }).promise();

        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn<MessageTranscodedSnsMessage>({ topicArn: messageTranscodedSnsTopicArn }),
          (response) => response.snsEvents.length === 1,
        );

        expect(snsEvents.length).toBe(1);

        expect(snsEvents[0]).toEqual(jasmine.objectContaining({
          message: {
            key: `${mockConversationId}/${mockMessageId}.mp3`,
            messageId: mockMessageId,
            newMimeType: "audio/mpeg",
          },
        }));
      } catch (error) {
        fail(error);
      }
    }, 60000);
  });
});
