/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { backoff, sns } from "../../../../e2e/util";
import { deleteSnsEventsByTopicArn, getSnsEventsByTopicArn, uploadTestTranscriptionFileIfNecessary } from "../util";
import { TranscriptionJobCompletedEvent } from "../../src/processor-services/transcriptionJobCompleted.sns.processor.service";

describe("Transcription Job Complete", () => {
  const transcriptionJobCompletedSnsTopicArn = process.env["transcription-job-completed-sns-topic-arn"] as string;
  const messageTranscribedTopicArn = process.env["message-transcribed-sns-topic-arn"] as string;
  const environment = process.env.environment as string;
  const mockMessageId = "mock-message-id";
  const jobName = `${environment}_${mockMessageId}`;

  describe("when a message is published to the Transcription Job Completed SNS topic", () => {
    beforeAll(async () => {
      await uploadTestTranscriptionFileIfNecessary({ messageId: mockMessageId });
    });

    beforeEach(async () => {
      await deleteSnsEventsByTopicArn({ topicArn: messageTranscribedTopicArn });
    });

    it("sends a message to the Message Transcribed SNS topic", async () => {
      try {
        const message: TranscriptionJobCompletedEvent = {
          id: "mock-id",
          version: "mock-version",
          account: "mock-account",
          time: "mock-time",
          region: "mock-region",
          resources: [ "mock-resource" ],
          source: "aws.transcribe",
          "detail-type": "Transcribe Job Event Change",
          detail: {
            TranscriptionJobName: jobName,
            TranscriptionJobStatus: "COMPLETED",
          },
        };

        await sns.publish({
          TopicArn: transcriptionJobCompletedSnsTopicArn,
          Message: JSON.stringify(message),
        }).promise();

        const { snsEvents } = await backoff(
          () => getSnsEventsByTopicArn({ topicArn: messageTranscribedTopicArn }),
          (response) => response.snsEvents.length === 1,
        );

        expect(snsEvents.length).toBe(1);
        expect(snsEvents[0]).toEqual(jasmine.objectContaining({
          message: {
            messageId: mockMessageId,
            transcript: jasmine.any(String),
          },
        }));
      } catch (error) {
        fail(error);
      }
    }, 60000);
  });
});
