/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Meeting } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { UserRemovedFromMeetingSnsProcessorService } from "../userRemovedFromMeeting.sns.processor.service";

describe("UserRemovedFromMeetingSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let userRemovedFromMeetingSnsProcessorService: SnsProcessorServiceInterface;

  const mockUserRemovedFromMeetingSnsTopicArn = "mock-user-added-to-meeting-sns-topic-arn";
  const mockConfig = { snsTopicArns: { userRemovedFromMeeting: mockUserRemovedFromMeetingSnsTopicArn } };
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
    topicArn: mockUserRemovedFromMeetingSnsTopicArn,
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

    userRemovedFromMeetingSnsProcessorService = new UserRemovedFromMeetingSnsProcessorService(loggerService, webSocketMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.userRemovedFromMeeting in the config", () => {
        it("returns true", () => {
          const result = userRemovedFromMeetingSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.userRemovedFromMeeting in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = userRemovedFromMeetingSnsProcessorService.determineRecordSupport(record);

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
        await userRemovedFromMeetingSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.UserRemovedFromMeeting, data: { meeting: mockMeeting, user: mockUser } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdTwo, event: WebSocketEvent.UserRemovedFromMeeting, data: { meeting: mockMeeting, user: mockUser } });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketMediatorService.sendMessage throws an error", () => {
        beforeEach(() => {
          webSocketMediatorService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userRemovedFromMeetingSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userRemovedFromMeetingSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userRemovedFromMeetingSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
