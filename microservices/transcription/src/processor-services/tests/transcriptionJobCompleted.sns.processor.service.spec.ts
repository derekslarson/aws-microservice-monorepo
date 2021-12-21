/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface } from "@yac/util";
import { TranscriptionService, TranscriptionServiceInterface } from "../../services/transcription.service";
import { TranscriptionJobCompletedSnsProcessorService } from "../transcriptionJobCompleted.sns.processor.service";

describe("TranscriptionJobCompletedSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let transcriptionService: Spied<TranscriptionServiceInterface>;
  let transcriptionJobCompletedSnsProcessorService: SnsProcessorServiceInterface;

  const mockTranscriptionJobCompletedSnsTopicArn = "mock-message-transcoded-sns-topic-arn";
  const mockConfig = { snsTopicArns: { transcriptionJobCompleted: mockTranscriptionJobCompletedSnsTopicArn } };
  const mockTranscriptionJobName = "mock-transcription-job-name";

  const mockRecord = {
    topicArn: mockTranscriptionJobCompletedSnsTopicArn,
    message: { detail: { TranscriptionJobName: mockTranscriptionJobName } },
  };
  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    transcriptionService = TestSupport.spyOnClass(TranscriptionService);

    transcriptionJobCompletedSnsProcessorService = new TranscriptionJobCompletedSnsProcessorService(loggerService, transcriptionService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.transcriptionJobCompleted in the config", () => {
        it("returns true", () => {
          const result = transcriptionJobCompletedSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.transcriptionJobCompleted in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = transcriptionJobCompletedSnsProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });
    });
  });

  describe("processRecord", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        transcriptionService.startTranscriptionJob.and.returnValue(Promise.resolve());
      });

      it("calls transcriptionService.transcriptionJobCompleted with the correct parameters", async () => {
        await transcriptionJobCompletedSnsProcessorService.processRecord(mockRecord);

        expect(transcriptionService.transcriptionJobCompleted).toHaveBeenCalledTimes(1);
        expect(transcriptionService.transcriptionJobCompleted).toHaveBeenCalledWith({ transcriptionJobName: mockTranscriptionJobName });
      });
    });

    describe("under error conditions", () => {
      describe("when transcriptionService.transcriptionJobCompleted throws an error", () => {
        beforeEach(() => {
          transcriptionService.transcriptionJobCompleted.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await transcriptionJobCompletedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, transcriptionJobCompletedSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await transcriptionJobCompletedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
