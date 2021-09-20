/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Message } from "@yac/util";
import { PushNotificationEvent } from "../../enums/pushNotification.event.enum";
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

  const mockToUser: User = {
    id: "user-mock-id-to",
    image: "mock-image",
  };

  const mockFromUser: User = {
    id: "user-mock-id-from",
    image: "mock-image",
    realName: "mock-realName",
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
    mimeType: "audio/mpeg",
    fetchUrl: "mock-fetch-url",
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

      describe("when from.realName is defined", () => {
        it("calls pushNotificationMediatorService.sendPushNotification with the correct parameters", async () => {
          await friendMessageCreatedSnsProcessorService.processRecord(mockRecord);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockToUser.id,
            event: PushNotificationEvent.FriendMessageCreated,
            title: "New Message Received",
            body: `Message from ${mockFromUser.realName as string}`,
          });
        });
      });

      describe("when from.realName isn't defined, but from.username is", () => {
        const mockRecordTwo = {
          ...mockRecord,
          message: {
            ...mockRecord.message,
            from: {
              id: mockRecord.message.from.id,
              username: "mock-username",
            },
          },
        };
        it("calls pushNotificationMediatorService.sendPushNotification with the correct parameters", async () => {
          await friendMessageCreatedSnsProcessorService.processRecord(mockRecordTwo);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockToUser.id,
            event: PushNotificationEvent.FriendMessageCreated,
            title: "New Message Received",
            body: `Message from ${mockRecordTwo.message.from.username}`,
          });
        });
      });

      describe("when from.realName and from.username aren't defined, but from.email is", () => {
        const mockRecordTwo = {
          ...mockRecord,
          message: {
            ...mockRecord.message,
            from: {
              id: mockRecord.message.from.id,
              email: "mock-email",
            },
          },
        };
        it("calls pushNotificationMediatorService.sendPushNotification with the correct parameters", async () => {
          await friendMessageCreatedSnsProcessorService.processRecord(mockRecordTwo);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockToUser.id,
            event: PushNotificationEvent.FriendMessageCreated,
            title: "New Message Received",
            body: `Message from ${mockRecordTwo.message.from.email}`,
          });
        });
      });

      describe("when from.realName, from.username and from.email aren't defined, but from.phone is", () => {
        const mockRecordTwo = {
          ...mockRecord,
          message: {
            ...mockRecord.message,
            from: {
              id: mockRecord.message.from.id,
              phone: "mock-phone",
            },
          },
        };
        it("calls pushNotificationMediatorService.sendPushNotification with the correct parameters", async () => {
          await friendMessageCreatedSnsProcessorService.processRecord(mockRecordTwo);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockToUser.id,
            event: PushNotificationEvent.FriendMessageCreated,
            title: "New Message Received",
            body: `Message from ${mockRecordTwo.message.from.phone}`,
          });
        });
      });

      it("calls webSocketMediatorService.sendMessage with the correct parameters", async () => {
        await friendMessageCreatedSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockToUser.id, event: WebSocketEvent.FriendMessageCreated, data: { to: mockToUser, from: mockFromUser, message: mockFriendMessage } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockFromUser.id, event: WebSocketEvent.FriendMessageCreated, data: { to: mockToUser, from: mockFromUser, message: mockFriendMessage } });
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
