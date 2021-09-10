/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, MessageMimeType } from "@yac/util";
import { PendingMessageService, PendingMessageServiceInterface } from "../../entity-services/pendingMessage.service";
import { KeyPrefix } from "../../enums/keyPrefix.enum";
import { MessageTranscodedSnsProcessorService } from "../messageTranscoded.sns.processor.service";

describe("MessageTranscodedSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let pendingMessageService: Spied<PendingMessageServiceInterface>;
  let messageTranscodedSnsProcessorService: SnsProcessorServiceInterface;

  const mockMessageTranscodedSnsTopicArn = "mock-message-transcoded-sns-topic-arn";
  const mockConfig = { snsTopicArns: { messageTranscoded: mockMessageTranscodedSnsTopicArn } };
  const mockMessageId = `${KeyPrefix.Message}mock-id`;
  const mockPendingMessageId = mockMessageId.replace(KeyPrefix.Message, KeyPrefix.PendingMessage);
  const mockMimeType = MessageMimeType.AudioMp3;

  const mockRecord = {
    topicArn: mockMessageTranscodedSnsTopicArn,
    message: {
      messageId: mockMessageId,
      newMimeType: mockMimeType,
    },
  };
  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    pendingMessageService = TestSupport.spyOnClass(PendingMessageService);

    messageTranscodedSnsProcessorService = new MessageTranscodedSnsProcessorService(loggerService, pendingMessageService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.messageTranscoded in the config", () => {
        it("returns true", () => {
          const result = messageTranscodedSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.messageTranscoded in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = messageTranscodedSnsProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });
    });
  });

  describe("processRecord", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        pendingMessageService.updatePendingMessage.and.returnValue(Promise.resolve());
      });

      it("calls pendingMessageService.updatePendingMessage with the correct parameters", async () => {
        await messageTranscodedSnsProcessorService.processRecord(mockRecord);

        expect(pendingMessageService.updatePendingMessage).toHaveBeenCalledTimes(1);
        expect(pendingMessageService.updatePendingMessage).toHaveBeenCalledWith({
          pendingMessageId: mockPendingMessageId,
          updates: { mimeType: mockMimeType },
        });
      });
    });

    describe("under error conditions", () => {
      describe("when pendingMessageService.updatePendingMessage throws an error", () => {
        beforeEach(() => {
          pendingMessageService.updatePendingMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await messageTranscodedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, messageTranscodedSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await messageTranscodedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
