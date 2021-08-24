/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Message } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { PushNotificationMediatorService, PushNotificationMediatorServiceInterface } from "../../mediator-services/pushNotification.mediator.service";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { FriendMessageCreatedSnsProcessorService } from "../friendMessageCreated.sns.processor.service";

describe("FriendMessageCreatedSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let pushNotificationMediatorService: Spied<PushNotificationMediatorServiceInterface>;
  let friendMessageCreatedSnsProcessorService: SnsProcessorServiceInterface;

  const mockFriendMessageCreatedSnsTopicArn = "mock-friend-message-created-sns-topic-arn";
  const mockConfig = { snsTopicArns: { friendMessageCreated: mockFriendMessageCreatedSnsTopicArn } };
  const mockMessageId = "message-id";
  const mockToUserId = "user-mock-id-to";
  const mockFromUserId = "user-mock-id-from";

  const mockToUser: User = {
    id: mockToUserId,
    image: "mock-image",
  };

  const mockFromUser: User = {
    id: mockFromUserId,
    image: "mock-image",
  };

  const mockFriendMessage: Message = {
    id: mockMessageId,
    to: mockToUserId,
    from: mockFromUserId,
    type: "friend",
    createdAt: new Date().toISOString(),
    seenAt: { [mockFromUserId]: new Date().toISOString() },
    reactions: {},
    replyCount: 0,
    mimeType: "audio/mpeg",
    fetchUrl: "mock-fetch-url",
    fromImage: "mock-from-image",
  };

  const mockRecord = {
    topicArn: mockFriendMessageCreatedSnsTopicArn,
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
    pushNotificationMediatorService = TestSupport.spyOnClass(PushNotificationMediatorService);

    friendMessageCreatedSnsProcessorService = new FriendMessageCreatedSnsProcessorService(loggerService, webSocketMediatorService, pushNotificationMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.friendMessageCreated in the config", () => {
        it("returns true", () => {
          const result = friendMessageCreatedSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.friendMessageCreated in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = friendMessageCreatedSnsProcessorService.determineRecordSupport(record);

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
        await friendMessageCreatedSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockToUserId, event: WebSocketEvent.FriendMessageCreated, data: { to: mockToUser, from: mockFromUser, message: mockFriendMessage } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockFromUserId, event: WebSocketEvent.FriendMessageCreated, data: { to: mockToUser, from: mockFromUser, message: mockFriendMessage } });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketMediatorService.sendMessage throws an error", () => {
        beforeEach(() => {
          webSocketMediatorService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await friendMessageCreatedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, friendMessageCreatedSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await friendMessageCreatedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
