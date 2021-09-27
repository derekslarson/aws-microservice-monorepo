/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Message, MessageMimeType } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { FriendMessageUpdatedSnsProcessorService } from "../friendMessageUpdated.sns.processor.service";

describe("FriendMessageUpdatedSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let friendMessageUpdatedSnsProcessorService: SnsProcessorServiceInterface;

  const mockFriendMessageUpdatedSnsTopicArn = "mock-friend-message-created-sns-topic-arn";
  const mockConfig = { snsTopicArns: { friendMessageUpdated: mockFriendMessageUpdatedSnsTopicArn } };
  const mockMessageId = "message-id";

  const mockToUser: User = {
    id: "user-mock-id-to",
    image: "mock-image",
  };

  const mockFromUser: User = {
    id: "user-mock-id-from",
    image: "mock-image",
  };

  const mockFriendMessage: Message = {
    id: mockMessageId,
    to: mockToUser,
    from: mockFromUser,
    type: "friend",
    createdAt: new Date().toISOString(),
    seenAt: { [mockFromUser.id]: new Date().toISOString() },
    reactions: {},
    replyCount: 0,
    mimeType: MessageMimeType.AudioMp3,
    fetchUrl: "mock-fetch-url",
  };

  const mockRecord = {
    topicArn: mockFriendMessageUpdatedSnsTopicArn,
    message: {
      to: mockToUser,
      from: mockFromUser,
      message: mockFriendMessage,
    },
  };
  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    webSocketMediatorService = TestSupport.spyOnClass(WebSocketMediatorService);

    friendMessageUpdatedSnsProcessorService = new FriendMessageUpdatedSnsProcessorService(loggerService, webSocketMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.friendMessageUpdated in the config", () => {
        it("returns true", () => {
          const result = friendMessageUpdatedSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.friendMessageUpdated in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = friendMessageUpdatedSnsProcessorService.determineRecordSupport(record);

          expect(result).toBe(false);
        });
      });
    });
  });

  describe("processRecord", () => {
    describe("under normal conditions", () => {
      beforeEach(() => {
        webSocketMediatorService.sendMessage.and.returnValue(Promise.resolve());
      });

      it("calls webSocketMediatorService.sendMessage with the correct parameters", async () => {
        await friendMessageUpdatedSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockToUser.id, event: WebSocketEvent.FriendMessageUpdated, data: { message: mockFriendMessage } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockFromUser.id, event: WebSocketEvent.FriendMessageUpdated, data: { message: mockFriendMessage } });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketMediatorService.sendMessage throws an error", () => {
        beforeEach(() => {
          webSocketMediatorService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await friendMessageUpdatedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, friendMessageUpdatedSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await friendMessageUpdatedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
