/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface } from "@yac/util";
import { TranscriptionService, TranscriptionServiceInterface } from "../../services/transcription.service";
import { TranscriptionJobFailedSnsProcessorService } from "../transcriptionJobFailed.sns.processor.service";

describe("TranscriptionJobFailedSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let transcriptionService: Spied<TranscriptionServiceInterface>;
  let transcriptionJobFailedSnsProcessorService: SnsProcessorServiceInterface;

  const mockTranscriptionJobFailedSnsTopicArn = "mock-message-transcoded-sns-topic-arn";
  const mockConfig = { snsTopicArns: { transcriptionJobFailed: mockTranscriptionJobFailedSnsTopicArn } };
  const mockTranscriptionJobName = "mock-transcription-job-name";

  const mockRecord = {
    topicArn: mockTranscriptionJobFailedSnsTopicArn,
    message: { detail: { TranscriptionJobName: mockTranscriptionJobName } },
  };
  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    transcriptionService = TestSupport.spyOnClass(TranscriptionService);

    transcriptionJobFailedSnsProcessorService = new TranscriptionJobFailedSnsProcessorService(loggerService, transcriptionService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.transcriptionJobFailed in the config", () => {
        it("returns true", () => {
          const result = transcriptionJobFailedSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.transcriptionJobFailed in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = transcriptionJobFailedSnsProcessorService.determineRecordSupport(record);

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

      it("calls transcriptionService.transcriptionJobFailed with the correct parameters", async () => {
        await transcriptionJobFailedSnsProcessorService.processRecord(mockRecord);

        expect(transcriptionService.transcriptionJobFailed).toHaveBeenCalledTimes(1);
        expect(transcriptionService.transcriptionJobFailed).toHaveBeenCalledWith({ transcriptionJobName: mockTranscriptionJobName });
      });
    });

    describe("under error conditions", () => {
      describe("when transcriptionService.transcriptionJobFailed throws an error", () => {
        beforeEach(() => {
          transcriptionService.transcriptionJobFailed.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await transcriptionJobFailedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, transcriptionJobFailedSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await transcriptionJobFailedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
