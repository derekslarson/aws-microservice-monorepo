/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Message, Group, MessageMimeType } from "@yac/util";
import { PushNotificationEvent } from "../../enums/pushNotification.event.enum";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { PushNotificationMediatorService, PushNotificationMediatorServiceInterface } from "../../mediator-services/pushNotification.mediator.service";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { GroupMessageCreatedSnsProcessorService } from "../groupMessageCreated.sns.processor.service";

describe("GroupMessageCreatedSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let pushNotificationMediatorService: Spied<PushNotificationMediatorServiceInterface>;
  let groupMessageCreatedSnsProcessorService: SnsProcessorServiceInterface;

  const mockGroupMessageCreatedSnsTopicArn = "mock-group-message-created-sns-topic-arn";
  const mockConfig = { snsTopicArns: { groupMessageCreated: mockGroupMessageCreatedSnsTopicArn } };
  const mockMessageId = "message-id";
  const mockUserIdOne = "user-mock-id-one";
  const mockUserIdTwo = "user-mock-id-two";

  const mockUser: User = {
    id: mockUserIdOne,
    image: "mock-image",
    realName: "mock-realName",
  };

  const mockGroup: Group = {
    id: "convo-group-mock-id",
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
    createdAt: new Date().toISOString(),
  };

  const mockMessage: Message = {
    id: mockMessageId,
    to: mockGroup,
    from: mockUser,
    type: "group",
    createdAt: new Date().toISOString(),
    seenAt: { [mockUserIdOne]: new Date().toISOString(), [mockUserIdTwo]: null },
    reactions: {},
    replyCount: 0,
    mimeType: MessageMimeType.AudioMp3,
    fetchUrl: "mock-fetch-url",
  };

  const mockRecord = {
    topicArn: mockGroupMessageCreatedSnsTopicArn,
    message: {
      groupMemberIds: [ mockUserIdOne, mockUserIdTwo ],
      to: mockGroup,
      from: mockUser,
      message: mockMessage,
    },
  };
  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    webSocketMediatorService = TestSupport.spyOnClass(WebSocketMediatorService);
    pushNotificationMediatorService = TestSupport.spyOnClass(PushNotificationMediatorService);

    groupMessageCreatedSnsProcessorService = new GroupMessageCreatedSnsProcessorService(loggerService, webSocketMediatorService, pushNotificationMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.groupMessageCreated in the config", () => {
        it("returns true", () => {
          const result = groupMessageCreatedSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.groupMessageCreated in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = groupMessageCreatedSnsProcessorService.determineRecordSupport(record);

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
          await groupMessageCreatedSnsProcessorService.processRecord(mockRecord);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockUserIdTwo,
            event: PushNotificationEvent.GroupMessageCreated,
            title: "New Message Received",
            body: `Message from ${mockUser.realName as string} in ${mockGroup.name}`,
          });
        });
      });

      describe("when from.realName isn't defined, but from.username is", () => {
        const mockRecordTwo = {
          ...mockRecord,
          message: {
            ...mockRecord.message,
            message: {
              ...mockRecord.message.message,
              from: {
                id: mockRecord.message.from.id,
                username: "mock-username",
              },
            },
          },
        };
        it("calls pushNotificationMediatorService.sendPushNotification with the correct parameters", async () => {
          await groupMessageCreatedSnsProcessorService.processRecord(mockRecordTwo);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockUserIdTwo,
            event: PushNotificationEvent.GroupMessageCreated,
            title: "New Message Received",
            body: `Message from ${mockRecordTwo.message.message.from.username} in ${mockGroup.name}`,
          });
        });
      });

      describe("when from.realName and from.username aren't defined, but from.email is", () => {
        const mockRecordTwo = {
          ...mockRecord,
          message: {
            ...mockRecord.message,
            message: {
              ...mockRecord.message.message,
              from: {
                id: mockRecord.message.from.id,
                email: "mock-email",
              },
            },
          },
        };
        it("calls pushNotificationMediatorService.sendPushNotification with the correct parameters", async () => {
          await groupMessageCreatedSnsProcessorService.processRecord(mockRecordTwo);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockUserIdTwo,
            event: PushNotificationEvent.GroupMessageCreated,
            title: "New Message Received",
            body: `Message from ${mockRecordTwo.message.message.from.email} in ${mockGroup.name}`,
          });
        });
      });

      describe("when from.realName, from.username and from.email aren't defined, but from.phone is", () => {
        const mockRecordTwo = {
          ...mockRecord,
          message: {
            ...mockRecord.message,
            message: {
              ...mockRecord.message.message,
              from: {
                id: mockRecord.message.from.id,
                phone: "mock-phone",
              },
            },
          },
        };
        it("calls pushNotificationMediatorService.sendPushNotification with the correct parameters", async () => {
          await groupMessageCreatedSnsProcessorService.processRecord(mockRecordTwo);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockUserIdTwo,
            event: PushNotificationEvent.GroupMessageCreated,
            title: "New Message Received",
            body: `Message from ${mockRecordTwo.message.message.from.phone} in ${mockGroup.name}`,
          });
        });
      });

      it("calls webSocketMediatorService.sendMessage with the correct parameters", async () => {
        await groupMessageCreatedSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.GroupMessageCreated, data: { message: mockMessage } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.GroupMessageCreated, data: { message: mockMessage } });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketMediatorService.sendMessage throws an error", () => {
        beforeEach(() => {
          webSocketMediatorService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await groupMessageCreatedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, groupMessageCreatedSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await groupMessageCreatedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
