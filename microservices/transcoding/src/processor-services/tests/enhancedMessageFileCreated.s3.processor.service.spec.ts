/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, S3ProcessorServiceInterface, S3ProcessorServiceRecord } from "@yac/util";
import { TranscodingService, TranscodingServiceInterface } from "../../services/transcoding.service";
import { EnhancedMessageFileCreatedS3ProcessorService } from "../enhancedMessageFileCreated.s3.processor.service";

describe("EnhancedMessageFileCreatedS3ProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let transcodingService: Spied<TranscodingServiceInterface>;
  let enhancedMessageFileCreatedS3ProcessorService: S3ProcessorServiceInterface;

  const mockEnhancedMessageBucketName = "mock-enhanced-message-bucket-name";
  const mockKey = "mock-key";

  const mockConfig = { bucketNames: { enhancedMessage: mockEnhancedMessageBucketName } };

  const mockRecord: S3ProcessorServiceRecord = {
    bucketName: mockEnhancedMessageBucketName,
    key: mockKey,
  };

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    transcodingService = TestSupport.spyOnClass(TranscodingService);

    enhancedMessageFileCreatedS3ProcessorService = new EnhancedMessageFileCreatedS3ProcessorService(loggerService, transcodingService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record that fits all necessary conditions", () => {
        it("returns true", () => {
          const result = enhancedMessageFileCreatedS3ProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record that isn't in the enhanced message bucket", () => {
        const record = {
          ...mockRecord,
          bucketName: "test",
        };

        it("returns false", () => {
          const result = enhancedMessageFileCreatedS3ProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });
    });
  });

  describe("processRecord", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        transcodingService.transcodingJobComplete.and.returnValue(Promise.resolve());
      });

      it("calls transcodingService.transcodingJobComplete with the correct parameters", async () => {
        await enhancedMessageFileCreatedS3ProcessorService.processRecord(mockRecord);

        expect(transcodingService.transcodingJobComplete).toHaveBeenCalledTimes(1);
        expect(transcodingService.transcodingJobComplete).toHaveBeenCalledWith({ key: mockKey });
      });
    });

    describe("under error conditions", () => {
      describe("when transcodingService.transcodingJobComplete throws an error", () => {
        beforeEach(() => {
          transcodingService.transcodingJobComplete.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await enhancedMessageFileCreatedS3ProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, enhancedMessageFileCreatedS3ProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await enhancedMessageFileCreatedS3ProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
