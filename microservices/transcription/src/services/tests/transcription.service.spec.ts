/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, generateAwsResponse, NotFoundError } from "@yac/util";
import { TranscribeService } from "aws-sdk";
import { TranscribeFactory, Transcribe } from "../../factories/transcribe.factory";
import { TranscriptionFileRepositoryInterface, TranscriptionS3Repository } from "../../repositories/transcriptionFile.repository";
import { MessageTranscribedSnsService, MessageTranscribedSnsServiceInterface } from "../../sns-services/messageTranscribed.sns.service";
import { TranscriptionService, TranscriptionServiceInterface } from "../transcription.service";

describe("TranscriptionService", () => {
  let transcribe: Spied<Transcribe>;
  const transcribeFactory: TranscribeFactory = () => transcribe as unknown as Transcribe;

  let loggerService: Spied<LoggerService>;
  let messageTranscribedSnsService: Spied<MessageTranscribedSnsServiceInterface>;
  let transcriptionFileRepository: Spied<TranscriptionFileRepositoryInterface>;
  let transcriptionService: TranscriptionServiceInterface;

  const mockEnvironment = "mock-environment";
  const mockMessageBucketName = "mock-message-bucket-name";
  const mockTranscriptionBucketName = "mock-transcription-bucket-name";
  const mockConfig = { environment: mockEnvironment, bucketNames: { message: mockMessageBucketName, transcription: mockTranscriptionBucketName } };
  const mockMessageFileKey = "mock-message-file-key";
  const mockMessageId = "mock-message-id";
  const mockTranscriptionJobName = `${mockEnvironment}_${mockMessageId}`;
  const mockMediaFileUri = `s3://${mockMessageBucketName}/${mockMessageFileKey}`;
  const mockRawTranscript = "Hey Justin. Hope you're doing well. Um just wanted to check um when I send a yak screen grab, there's no thumbnail for the video, so um it looks like a wide screen with the play button at the bottom, but if there is a thumbnail it would be really awesome. I don't know if it already exists, but currently for my videos, I'm not able to have a thumbnail, so let me know how that goes. Thanks. This is just a test. This is not a real message. please disregard. Foo bar. Testing 123.";
  const mockModifiedTranscript = "Hey Justin. Hope you're doing well. just wanted to check when I send a Yac screen grab, there's no thumbnail for the video, so it looks like a wide screen with the play button at the bottom, but if there is a thumbnail it would be really awesome.<br><br>I don't know if it already exists, but currently for my videos, I'm not able to have a thumbnail, so let me know how that goes. Thanks. This is just a test.<br><br>This is not a real message. please disregard. Foo bar. Testing 123.";
  const mockTranscriptionFileBody = JSON.stringify({
    results: {
      transcripts: [
        { transcript: mockRawTranscript },
      ],
    },
  });

  const mockError = new Error("test");

  beforeEach(() => {
    transcribe = TestSupport.spyOnObject(new TranscribeService());
    loggerService = TestSupport.spyOnClass(LoggerService);
    messageTranscribedSnsService = TestSupport.spyOnClass(MessageTranscribedSnsService);
    transcriptionFileRepository = TestSupport.spyOnClass(TranscriptionS3Repository);

    transcriptionService = new TranscriptionService(loggerService, messageTranscribedSnsService, transcriptionFileRepository, mockConfig, transcribeFactory);
  });

  describe("startTranscriptionJob", () => {
    const params = { messageFileKey: mockMessageFileKey, messageId: mockMessageId };

    describe("under normal conditions", () => {
      beforeEach(() => {
        transcribe.startTranscriptionJob.and.returnValue(generateAwsResponse({}));
      });

      it("calls transcribe.startTranscriptionJob with the correct params", async () => {
        await transcriptionService.startTranscriptionJob(params);

        expect(transcribe.startTranscriptionJob).toHaveBeenCalledTimes(1);
        expect(transcribe.startTranscriptionJob).toHaveBeenCalledWith({
          TranscriptionJobName: mockTranscriptionJobName,
          Media: { MediaFileUri: mockMediaFileUri },
          OutputBucketName: mockTranscriptionBucketName,
          IdentifyLanguage: true,
        });
      });
    });

    describe("under error conditions", () => {
      describe("when transcribe.startTranscriptionJob throws an error", () => {
        beforeEach(() => {
          transcribe.startTranscriptionJob.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await transcriptionService.startTranscriptionJob(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in startTranscriptionJob", { error: mockError, params }, transcriptionService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await transcriptionService.startTranscriptionJob(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });

  describe("transcriptionJobCompleted", () => {
    const params = { transcriptionJobName: mockTranscriptionJobName };

    describe("under normal conditions", () => {
      beforeEach(() => {
        transcriptionFileRepository.getObject.and.returnValue(Promise.resolve({ Body: mockTranscriptionFileBody }));
      });

      it("calls transcriptionFileRepository.getObject with the correct params", async () => {
        await transcriptionService.transcriptionJobCompleted(params);

        expect(transcriptionFileRepository.getObject).toHaveBeenCalledTimes(1);
        expect(transcriptionFileRepository.getObject).toHaveBeenCalledWith({ key: `${mockTranscriptionJobName}.json` });
      });

      it("calls messageTranscribedSnsService.sendMessage with the correct params", async () => {
        await transcriptionService.transcriptionJobCompleted(params);

        expect(messageTranscribedSnsService.sendMessage).toHaveBeenCalledTimes(1);
        expect(messageTranscribedSnsService.sendMessage).toHaveBeenCalledWith({ messageId: mockMessageId, transcript: mockModifiedTranscript });
      });

      describe("when transcriptionFileRepository.getObject returns a body without a transcript", () => {
        const mockTranscriptionFileBodyNoTranscript = JSON.stringify({ results: { transcripts: [] } });

        beforeEach(() => {
          transcriptionFileRepository.getObject.and.returnValue(Promise.resolve({ Body: mockTranscriptionFileBodyNoTranscript }));
        });

        it("calls messageTranscribedSnsService.sendMessage with the correct params", async () => {
          await transcriptionService.transcriptionJobCompleted(params);

          expect(messageTranscribedSnsService.sendMessage).toHaveBeenCalledTimes(1);
          expect(messageTranscribedSnsService.sendMessage).toHaveBeenCalledWith({ messageId: mockMessageId, transcript: "" });
        });
      });
    });

    describe("under error conditions", () => {
      describe("when transcriptionFileRepository.getObject doesn't return a body", () => {
        beforeEach(() => {
          transcriptionFileRepository.getObject.and.returnValue(Promise.resolve({ }));
        });

        it("throws a NotFoundError error", async () => {
          try {
            await transcriptionService.transcriptionJobCompleted(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBeInstanceOf(NotFoundError);
          }
        });
      });

      describe("when messageTranscribedSnsService.sendMessage throws an error", () => {
        beforeEach(() => {
          transcriptionFileRepository.getObject.and.returnValue(Promise.resolve({ Body: mockTranscriptionFileBody }));
          messageTranscribedSnsService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await transcriptionService.transcriptionJobCompleted(params);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in transcriptionJobCompleted", { error: mockError, params }, transcriptionService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await transcriptionService.transcriptionJobCompleted(params);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
