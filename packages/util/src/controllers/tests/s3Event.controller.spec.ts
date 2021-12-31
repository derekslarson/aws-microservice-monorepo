/* eslint-disable @typescript-eslint/unbound-method */
import { S3Event } from "aws-lambda/trigger/s3";
import { DynamoProcessorServiceInterface } from "../../services/interfaces/dynamo.processor.service.interface";
import { Spied, TestSupport } from "../../test-support";
import { S3EventController, S3EventControllerInterface } from "../s3Event.controller";
import { LoggerService } from "../../services/logger.service";
import { S3ProcessorServiceRecord } from "../../services/interfaces/s3.processor.service.interface";
import { generateMockS3EventRecord } from "../../test-support/generateMockS3EventRecord";

describe("S3EventController", () => {
  let loggerService: Spied<LoggerService>;
  let s3EventController: S3EventControllerInterface;
  let mockProcessorServiceA: Spied<DynamoProcessorServiceInterface>;
  let mockProcessorServiceB: Spied<DynamoProcessorServiceInterface>;

  const mockBucketName = "mock-bucket-name";
  const mockObjectKey = "mock/file.test";
  const mockError = new Error("mock-error");

  const mockRawRecord = generateMockS3EventRecord(mockObjectKey, mockBucketName);

  const mockEvent: S3Event = { Records: [ mockRawRecord ] };

  const mockPreparedRecord: S3ProcessorServiceRecord = {
    bucketName: mockBucketName,
    key: mockObjectKey,
  };

  const mockDummyPreparedRecord: S3ProcessorServiceRecord = {
    bucketName: "",
    key: "",
  };

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);

    mockProcessorServiceA = {
      determineRecordSupport: jasmine.createSpy("determineRecordSupport"),
      processRecord: jasmine.createSpy("processRecord"),
    };

    mockProcessorServiceB = {
      determineRecordSupport: jasmine.createSpy("determineRecordSupport"),
      processRecord: jasmine.createSpy("processRecord"),
    };

    s3EventController = new S3EventController(loggerService, [ mockProcessorServiceA, mockProcessorServiceB ]);
  });

  describe("handleS3Event", () => {
    describe("under normal conditions", () => {
      describe("when passed an event containing a record", () => {
        it("calls determineRecordSupport for every processor service", async () => {
          await s3EventController.handleS3Event(mockEvent);

          expect(mockProcessorServiceA.determineRecordSupport).toHaveBeenCalledTimes(1);
          expect(mockProcessorServiceA.determineRecordSupport).toHaveBeenCalledWith(mockPreparedRecord);

          expect(mockProcessorServiceB.determineRecordSupport).toHaveBeenCalledTimes(1);
          expect(mockProcessorServiceB.determineRecordSupport).toHaveBeenCalledWith(mockPreparedRecord);
        });

        describe("when one processor service's determineRecordSupport returns true", () => {
          beforeEach(() => {
            mockProcessorServiceA.determineRecordSupport.and.returnValue(true);
            mockProcessorServiceB.determineRecordSupport.and.returnValue(false);

            mockProcessorServiceA.processRecord.and.returnValue(Promise.resolve());
          });

          it("calls that processor service's processRecord with the correct params", async () => {
            await s3EventController.handleS3Event(mockEvent);

            expect(mockProcessorServiceA.processRecord).toHaveBeenCalledTimes(1);
            expect(mockProcessorServiceA.processRecord).toHaveBeenCalledWith(mockPreparedRecord);
          });

          it("doesnt call the other processor service's processRecord", async () => {
            await s3EventController.handleS3Event(mockEvent);

            expect(mockProcessorServiceB.processRecord).toHaveBeenCalledTimes(0);
          });
        });
      });
    });

    describe("under error conditions", () => {
      describe("when one processorService's processRecord throws an error", () => {
        beforeEach(() => {
          mockProcessorServiceA.determineRecordSupport.and.returnValue(true);
          mockProcessorServiceA.processRecord.and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService with the correct params", async () => {
          await s3EventController.handleS3Event(mockEvent);

          expect(loggerService.error).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error calling 1 of 2 processor services.", { errors: [ mockError ], record: mockPreparedRecord }, s3EventController.constructor.name);
        });
      });

      describe("when the s3 record is missing necessary properties", () => {
        const mockEventWithoutNecessaryProps = { Records: [ {} ] };

        it("returns a dummy record", async () => {
          await s3EventController.handleS3Event(mockEventWithoutNecessaryProps as S3Event);

          expect(mockProcessorServiceA.determineRecordSupport).toHaveBeenCalledTimes(1);
          expect(mockProcessorServiceA.determineRecordSupport).toHaveBeenCalledWith(mockDummyPreparedRecord);

          expect(mockProcessorServiceB.determineRecordSupport).toHaveBeenCalledTimes(1);
          expect(mockProcessorServiceB.determineRecordSupport).toHaveBeenCalledWith(mockDummyPreparedRecord);
        });
      });
    });
  });
});
