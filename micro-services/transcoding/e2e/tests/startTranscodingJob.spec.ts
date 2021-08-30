/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { readFileSync } from "fs";
import { backoff, s3, URL_REGEX } from "../../../../e2e/util";
import { deleteHttpEventsByPath, getHttpEventsByPath } from "../util";

describe("Start Transcoding Job", () => {
  const audoAiTranscodingApiPath = "/v1/remove-noise";
  const rawMessageS3BucketName = process.env["raw-message-s3-bucket-name"] as string;

  describe("when a file is uploaded to the S3 raw message S3 bucket", () => {
    beforeEach(async () => {
      await deleteHttpEventsByPath({ path: audoAiTranscodingApiPath });
    });

    it("calls Audo AI to start a transcoding job", async () => {
      try {
        const mockConversationId = "mock-conversation-id";
        const mockMessageId = "mock-message-id";

        const file = readFileSync(`${process.cwd()}/e2e/test-raw-message.mp4`);

        await s3.upload({
          Bucket: rawMessageS3BucketName,
          Key: `${mockConversationId}/${mockMessageId}.mp4`,
          Body: file,
        }).promise();

        const { httpEvents } = await backoff(
          () => getHttpEventsByPath({ path: audoAiTranscodingApiPath }),
          (response) => response.httpEvents.length === 1,
        );

        expect(httpEvents.length).toBe(1);

        expect(httpEvents[0]).toEqual(jasmine.objectContaining({
          method: "POST",
          path: audoAiTranscodingApiPath,
          headers: jasmine.objectContaining({ "x-api-key": jasmine.any(String) }),
          body: {
            input: jasmine.stringMatching(URL_REGEX),
            output: jasmine.stringMatching(URL_REGEX),
            outputExtension: "mp3",
          },
        }));
      } catch (error) {
        fail(error);
      }
    }, 60000);
  });
});
