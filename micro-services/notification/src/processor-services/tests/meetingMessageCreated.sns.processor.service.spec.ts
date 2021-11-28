/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Message, Meeting, MessageMimeType } from "@yac/util";
import { PushNotificationEvent } from "../../enums/pushNotification.event.enum";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { PushNotificationMediatorService, PushNotificationMediatorServiceInterface } from "../../mediator-services/pushNotification.mediator.service";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { MeetingMessageCreatedSnsProcessorService } from "../meetingMessageCreated.sns.processor.service";

describe("MeetingMessageCreatedSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let pushNotificationMediatorService: Spied<PushNotificationMediatorServiceInterface>;
  let meetingMessageCreatedSnsProcessorService: SnsProcessorServiceInterface;

  const mockMeetingMessageCreatedSnsTopicArn = "mock-meeting-message-created-sns-topic-arn";
  const mockConfig = { snsTopicArns: { meetingMessageCreated: mockMeetingMessageCreatedSnsTopicArn } };
  const mockMessageId = "message-id";
  const mockUserIdOne = "user-mock-id-one";
  const mockUserIdTwo = "user-mock-id-two";

  const mockUser: User = {
    id: mockUserIdOne,
    image: "mock-image",
    name: "mock-name",
  };

  const mockMeeting: Meeting = {
    id: "convo-meeting-mock-id",
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
    createdAt: new Date().toISOString(),
    dueDate: new Date().toISOString(),
  };

  const mockMessage: Message = {
    id: mockMessageId,
    to: mockMeeting,
    from: mockUser,
    type: "meeting",
    createdAt: new Date().toISOString(),
    seenAt: { [mockUserIdOne]: new Date().toISOString(), [mockUserIdTwo]: null },
    reactions: {},
    replyCount: 0,
    title: "mock-title",
    mimeType: MessageMimeType.AudioMp3,
    fetchUrl: "mock-fetch-url",
  };

  const mockRecord = {
    topicArn: mockMeetingMessageCreatedSnsTopicArn,
    message: {
      meetingMemberIds: [ mockUserIdOne, mockUserIdTwo ],
      to: mockMeeting,
      from: mockUser,
      message: mockMessage,
    },
  };
  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    webSocketMediatorService = TestSupport.spyOnClass(WebSocketMediatorService);
    pushNotificationMediatorService = TestSupport.spyOnClass(PushNotificationMediatorService);

    meetingMessageCreatedSnsProcessorService = new MeetingMessageCreatedSnsProcessorService(loggerService, webSocketMediatorService, pushNotificationMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.meetingMessageCreated in the config", () => {
        it("returns true", () => {
          const result = meetingMessageCreatedSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.meetingMessageCreated in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = meetingMessageCreatedSnsProcessorService.determineRecordSupport(record);

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

      describe("when from.name is defined", () => {
        it("calls pushNotificationMediatorService.sendPushNotification with the correct parameters", async () => {
          await meetingMessageCreatedSnsProcessorService.processRecord(mockRecord);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockUserIdTwo,
            event: PushNotificationEvent.MeetingMessageCreated,
            title: "New Message Received",
            body: `Message from ${mockUser.name as string} in ${mockMeeting.name}`,
          });
        });
      });

      describe("when from.name isn't defined, but from.username is", () => {
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
          await meetingMessageCreatedSnsProcessorService.processRecord(mockRecordTwo);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockUserIdTwo,
            event: PushNotificationEvent.MeetingMessageCreated,
            title: "New Message Received",
            body: `Message from ${mockRecordTwo.message.message.from.username} in ${mockMeeting.name}`,
          });
        });
      });

      describe("when from.name and from.username aren't defined, but from.email is", () => {
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
          await meetingMessageCreatedSnsProcessorService.processRecord(mockRecordTwo);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockUserIdTwo,
            event: PushNotificationEvent.MeetingMessageCreated,
            title: "New Message Received",
            body: `Message from ${mockRecordTwo.message.message.from.email} in ${mockMeeting.name}`,
          });
        });
      });

      describe("when from.name, from.username and from.email aren't defined, but from.phone is", () => {
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
          await meetingMessageCreatedSnsProcessorService.processRecord(mockRecordTwo);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockUserIdTwo,
            event: PushNotificationEvent.MeetingMessageCreated,
            title: "New Message Received",
            body: `Message from ${mockRecordTwo.message.message.from.phone} in ${mockMeeting.name}`,
          });
        });
      });

      it("calls webSocketMediatorService.sendMessage with the correct parameters", async () => {
        await meetingMessageCreatedSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.MeetingMessageCreated, data: { message: mockMessage } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.MeetingMessageCreated, data: { message: mockMessage } });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketMediatorService.sendMessage throws an error", () => {
        beforeEach(() => {
          webSocketMediatorService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await meetingMessageCreatedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, meetingMessageCreatedSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await meetingMessageCreatedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
