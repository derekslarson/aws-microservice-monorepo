/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Meeting } from "@yac/util";
import { PushNotificationEvent } from "../../enums/pushNotification.event.enum";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { PushNotificationMediatorService, PushNotificationMediatorServiceInterface } from "../../mediator-services/pushNotification.mediator.service";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { UserAddedToMeetingSnsProcessorService } from "../userAddedToMeeting.sns.processor.service";

describe("UserAddedToMeetingSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let pushNotificationMediatorService: Spied<PushNotificationMediatorServiceInterface>;
  let userAddedToMeetingSnsProcessorService: SnsProcessorServiceInterface;

  const mockUserAddedToMeetingSnsTopicArn = "mock-user-added-to-meeting-sns-topic-arn";
  const mockConfig = { snsTopicArns: { userAddedToMeeting: mockUserAddedToMeetingSnsTopicArn } };
  const mockUserIdOne = "user-mock-id-one";
  const mockUserIdTwo = "user-mock-id-two";
  const mockMeetingMemberIds = [ mockUserIdOne, mockUserIdTwo ];

  const mockUser: User = {
    id: mockUserIdOne,
    image: "mock-image",
  };

  const mockMeeting: Meeting = {
    id: "convo-meeting-mock-id",
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
    createdAt: new Date().toISOString(),
    dueDate: new Date().toISOString(),
  };

  const mockRecord = {
    topicArn: mockUserAddedToMeetingSnsTopicArn,
    message: {
      user: mockUser,
      meeting: mockMeeting,
      meetingMemberIds: mockMeetingMemberIds,
    },
  };
  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    webSocketMediatorService = TestSupport.spyOnClass(WebSocketMediatorService);
    pushNotificationMediatorService = TestSupport.spyOnClass(PushNotificationMediatorService);

    userAddedToMeetingSnsProcessorService = new UserAddedToMeetingSnsProcessorService(loggerService, webSocketMediatorService, pushNotificationMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.userAddedToMeeting in the config", () => {
        it("returns true", () => {
          const result = userAddedToMeetingSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.userAddedToMeeting in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = userAddedToMeetingSnsProcessorService.determineRecordSupport(record);

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

      it("calls pushNotificationMediatorService.sendPushNotification with the correct parameters", async () => {
        await userAddedToMeetingSnsProcessorService.processRecord(mockRecord);

        expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
        expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
          userId: mockUserIdOne,
          event: PushNotificationEvent.UserAddedToMeeting,
          title: "Added to Meeting",
          body: `You've been added to the meeting ${mockMeeting.name}`,
        });
      });

      it("calls webSocketMediatorService.sendMessage with the correct parameters", async () => {
        await userAddedToMeetingSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.UserAddedToMeeting, data: { meeting: mockMeeting, user: mockUser } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdTwo, event: WebSocketEvent.UserAddedToMeeting, data: { meeting: mockMeeting, user: mockUser } });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketMediatorService.sendMessage throws an error", () => {
        beforeEach(() => {
          webSocketMediatorService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userAddedToMeetingSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userAddedToMeetingSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userAddedToMeetingSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
