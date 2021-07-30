/* eslint-disable @typescript-eslint/unbound-method */
import { DynamoDBRecord, DynamoDBStreamEvent } from "aws-lambda";
import { Unmarshall, UnmarshallFactory } from "../../factories/unmarshall.factory";
import { DynamoProcessorServiceInterface, DynamoProcessorServiceRecord } from "../../services/interfaces/dynamo.processor.service.interface";
import { Spied, TestSupport } from "../../test-support";
import { DynamoStreamController, DynamoStreamControllerInterface } from "../dynamoStream.controller";
import { LoggerService } from "../../services/logger.service";

describe("DynamoStreamController", () => {
  let unmarshall: jasmine.Spy<Unmarshall>;

  const unmarshallFactory: UnmarshallFactory = () => unmarshall;
  let loggerService: Spied<LoggerService>;
  let dynamoStreamController: DynamoStreamControllerInterface;
  let mockProcessorServiceA: Spied<DynamoProcessorServiceInterface>;
  let mockProcessorServiceB: Spied<DynamoProcessorServiceInterface>;

  const mockTableName = "test-table";
  const mockEnvConfig = { tableNames: { TEST_TABLE: mockTableName } };
  const mockUnmarshalledImage = { b: "new value" };
  const mockEventName = "MODIFY";
  const mockError = new Error("test");

  const mockRawRecord: DynamoDBRecord = {
    eventSourceARN: `/${mockTableName}/`,
    eventName: mockEventName,
    dynamodb: {
      NewImage: { b: { S: "new value" } },
      OldImage: { b: { S: "old value" } },
    },
  };

  const mockEvent: DynamoDBStreamEvent = { Records: [ mockRawRecord ] };

  const mockPreparedRecord: DynamoProcessorServiceRecord = {
    tableName: mockTableName,
    eventName: mockEventName,
    oldImage: mockUnmarshalledImage,
    newImage: mockUnmarshalledImage,
  };

  const mockDummyPreparedRecord = {
    tableName: "",
    eventName: "UNKNOWN",
    newImage: {},
    oldImage: {},
  };

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    unmarshall = jasmine.createSpy("unmarshal").and.returnValue(mockUnmarshalledImage);

    mockProcessorServiceA = {
      determineRecordSupport: jasmine.createSpy("determineRecordSupport").and.returnValue(true),
      processRecord: jasmine.createSpy("processRecord").and.returnValue(Promise.resolve()),
    };

    mockProcessorServiceB = {
      determineRecordSupport: jasmine.createSpy("determineRecordSupport").and.returnValue(false),
      processRecord: jasmine.createSpy("processRecord").and.returnValue(Promise.resolve()),
    };

    dynamoStreamController = new DynamoStreamController(
      mockEnvConfig,
      [ mockProcessorServiceA, mockProcessorServiceB ],
      unmarshallFactory,
      loggerService,
    );
  });

  describe("handleStreamEvent", () => {
    describe("under normal conditions", () => {
      describe("when passed an event containing a record", () => {
        it("calls determineRecordSupport for every processor service", async () => {
          await dynamoStreamController.handleStreamEvent(mockEvent);

          expect(mockProcessorServiceA.determineRecordSupport).toHaveBeenCalledTimes(1);
          expect(mockProcessorServiceA.determineRecordSupport).toHaveBeenCalledWith(mockPreparedRecord);

          expect(mockProcessorServiceB.determineRecordSupport).toHaveBeenCalledTimes(1);
          expect(mockProcessorServiceB.determineRecordSupport).toHaveBeenCalledWith(mockPreparedRecord);
        });

        describe("when one processor service's determineRecordSupport returns true", () => {
          it("calls that processor service's processRecord with the correct params", async () => {
            await dynamoStreamController.handleStreamEvent(mockEvent);

            expect(mockProcessorServiceA.processRecord).toHaveBeenCalledTimes(1);
            expect(mockProcessorServiceA.processRecord).toHaveBeenCalledWith(mockPreparedRecord);
          });

          it("doesnt call the other processor service's processRecord", async () => {
            await dynamoStreamController.handleStreamEvent(mockEvent);

            expect(mockProcessorServiceB.processRecord).toHaveBeenCalledTimes(0);
          });
        });
      });
    });

    describe("under error conditions", () => {
      describe("when one processorService's processRecord throws an error", () => {
        beforeEach(() => {
          mockProcessorServiceA.processRecord.and.returnValue(Promise.reject(mockError));
        });

        it("calls loggerService with the correct params", async () => {
          await dynamoStreamController.handleStreamEvent(mockEvent);

          expect(loggerService.error).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error calling 1 of 2 processor services.", { errors: [ mockError ], record: mockPreparedRecord }, dynamoStreamController.constructor.name);
        });
      });

      describe("when unmarshall throws an error", () => {
        beforeEach(() => {
          unmarshall.and.throwError(mockError);
        });

        it("calls loggerService with the correct params", async () => {
          await dynamoStreamController.handleStreamEvent(mockEvent);

          expect(loggerService.error).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error in prepareRecordsForProcessorServices", { error: mockError, record: mockRawRecord }, dynamoStreamController.constructor.name);
        });

        it("returns a dummy record and swallows the error", async () => {
          await dynamoStreamController.handleStreamEvent(mockEvent);

          expect(mockProcessorServiceA.determineRecordSupport).toHaveBeenCalledTimes(1);
          expect(mockProcessorServiceA.determineRecordSupport).toHaveBeenCalledWith(mockDummyPreparedRecord);

          expect(mockProcessorServiceB.determineRecordSupport).toHaveBeenCalledTimes(1);
          expect(mockProcessorServiceB.determineRecordSupport).toHaveBeenCalledWith(mockDummyPreparedRecord);
        });
      });

      describe("when the dynamo record is missing necessary properties", () => {
        const mockEventWithoutNecessaryProps: DynamoDBStreamEvent = { Records: [ {} ] };
        it("returns a dummy record", async () => {
          await dynamoStreamController.handleStreamEvent(mockEventWithoutNecessaryProps);

          expect(mockProcessorServiceA.determineRecordSupport).toHaveBeenCalledTimes(1);
          expect(mockProcessorServiceA.determineRecordSupport).toHaveBeenCalledWith(mockDummyPreparedRecord);

          expect(mockProcessorServiceB.determineRecordSupport).toHaveBeenCalledTimes(1);
          expect(mockProcessorServiceB.determineRecordSupport).toHaveBeenCalledWith(mockDummyPreparedRecord);
        });
      });
    });
  });
});
