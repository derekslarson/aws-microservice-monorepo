/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsFactory, MessageTranscribedSnsMessage } from "@yac/util";
import SNS from "aws-sdk/clients/sns";
import { MessageTranscribedSnsService, MessageTranscribedSnsServiceInterface } from "../messageTranscribed.sns.service";

interface MessageTranscribedSnsServiceWithAnyMethod extends MessageTranscribedSnsServiceInterface {
  [key: string]: any;
}

describe("MessageTranscribedSnsService", () => {
  let sns: Spied<SNS>;
  const snsFactory: SnsFactory = () => sns as unknown as SNS;

  let loggerService: Spied<LoggerService>;
  let messageTranscribedSnsService: MessageTranscribedSnsServiceWithAnyMethod;

  const mockMessageTranscribedSnsTopicArn = "mock-message-transcribed-sns-topic-arn";
  const mockConfig = { snsTopicArns: { messageTranscribed: mockMessageTranscribedSnsTopicArn } };
  const mockMessageId = "message-id" as MessageTranscribedSnsMessage["messageId"];
  const mockTranscript = "mock-transcript";

  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);

    messageTranscribedSnsService = new MessageTranscribedSnsService(loggerService, snsFactory, mockConfig);
  });

  describe("sendMessage", () => {
    const mockMessage = { messageId: mockMessageId, transcript: mockTranscript };

    describe("under normal conditions", () => {
      beforeEach(() => {
        spyOn(messageTranscribedSnsService, "publish").and.returnValue(Promise.resolve());
      });
      it("calls this.publish with the correct params", async () => {
        await messageTranscribedSnsService.sendMessage(mockMessage);

        expect(messageTranscribedSnsService.publish).toHaveBeenCalledTimes(1);
        expect(messageTranscribedSnsService.publish).toHaveBeenCalledWith(mockMessage);
      });
    });

    describe("under error conditions", () => {
      beforeEach(() => {
        spyOn(messageTranscribedSnsService, "publish").and.throwError(mockError);
      });

      describe("when this.publish throws", () => {
        it("calls loggerService.error with the correct params", async () => {
          try {
            await messageTranscribedSnsService.sendMessage(mockMessage);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in sendMessage", { error: mockError, message: mockMessage }, messageTranscribedSnsService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await messageTranscribedSnsService.sendMessage(mockMessage);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
