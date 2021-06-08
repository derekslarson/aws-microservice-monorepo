/* eslint-disable @typescript-eslint/unbound-method */
import { SNSEvent, SNSEventRecord } from "aws-lambda";
import { DynamoProcessorServiceInterface } from "../../services/interfaces/dynamo.processor.service.interface";
import { Spied, TestSupport } from "../../test-support";
import { SnsEventController, SnsEventControllerInterface } from "../snsEvent.controller";
import { LoggerService } from "../../services/logger.service";
import { SnsProcessorServiceRecord } from "../../services/interfaces/sns.processor.service.interface";

describe("SnsEventController", () => {
  let loggerService: Spied<LoggerService>;
  let snsEventController: SnsEventControllerInterface;
  let mockProcessorServiceA: Spied<DynamoProcessorServiceInterface>;
  let mockProcessorServiceB: Spied<DynamoProcessorServiceInterface>;

  const mockSnsTopicArn = "mock-sns-topic-arm";
  const mockError = new Error("mock-error");
  const mockMessage = { a: 1, b: "two" };

  const mockRawRecord: SNSEventRecord = {
    EventVersion: "mock-event-version",
    EventSubscriptionArn: "mock-event-subscription-arn",
    EventSource: "mock-event-source",
    Sns: {
      TopicArn: mockSnsTopicArn,
      Message: JSON.stringify(mockMessage),
      SignatureVersion: "mock-signature-version",
      Timestamp: "mock-timestamp",
      Signature: "mock-signature",
      SigningCertUrl: "mock-signing-cert-url",
      MessageId: "mock-message-id",
      MessageAttributes: {},
      Type: "mock-type",
      UnsubscribeUrl: "mock-unsubscribe-url",
      Subject: "mock-subject",
    },
  };

  const mockEvent: SNSEvent = { Records: [ mockRawRecord ] };

  const mockPreparedRecord: SnsProcessorServiceRecord = {
    topicArn: mockSnsTopicArn,
    message: mockMessage,
  };

  const mockDummyPreparedRecord: SnsProcessorServiceRecord = {
    topicArn: "",
    message: {},
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

    snsEventController = new SnsEventController(loggerService, [ mockProcessorServiceA, mockProcessorServiceB ]);
  });

  describe("handleSnsEvent", () => {
    describe("under normal conditions", () => {
      describe("when passed an event containing a record", () => {
        it("calls determineRecordSupport for every processor service", async () => {
          await snsEventController.handleSnsEvent(mockEvent);

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
            await snsEventController.handleSnsEvent(mockEvent);

            expect(mockProcessorServiceA.processRecord).toHaveBeenCalledTimes(1);
            expect(mockProcessorServiceA.processRecord).toHaveBeenCalledWith(mockPreparedRecord);
          });

          it("doesnt call the other processor service's processRecord", async () => {
            await snsEventController.handleSnsEvent(mockEvent);

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
          await snsEventController.handleSnsEvent(mockEvent);

          expect(loggerService.error).toHaveBeenCalledTimes(1);
          expect(loggerService.error).toHaveBeenCalledWith("Error calling 1 of 2 processor services.", { errors: [ mockError ], record: mockPreparedRecord }, snsEventController.constructor.name);
        });
      });

      describe("when the sns record is missing necessary properties", () => {
        const mockEventWithoutNecessaryProps = { Records: [ {} ] };

        it("returns a dummy record", async () => {
          await snsEventController.handleSnsEvent(mockEventWithoutNecessaryProps as SNSEvent);

          expect(mockProcessorServiceA.determineRecordSupport).toHaveBeenCalledTimes(1);
          expect(mockProcessorServiceA.determineRecordSupport).toHaveBeenCalledWith(mockDummyPreparedRecord);

          expect(mockProcessorServiceB.determineRecordSupport).toHaveBeenCalledTimes(1);
          expect(mockProcessorServiceB.determineRecordSupport).toHaveBeenCalledWith(mockDummyPreparedRecord);
        });
      });
    });
  });
});
