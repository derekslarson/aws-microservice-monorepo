/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Message, Meeting } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { MeetingMessageUpdatedSnsProcessorService } from "../meetingMessageUpdated.sns.processor.service";

describe("MeetingMessageUpdatedSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let meetingMessageUpdatedSnsProcessorService: SnsProcessorServiceInterface;

  const mockMeetingMessageUpdatedSnsTopicArn = "mock-meeting-message-updated-sns-topic-arn";
  const mockConfig = { snsTopicArns: { meetingMessageUpdated: mockMeetingMessageUpdatedSnsTopicArn } };
  const mockMessageId = "message-id";
  const mockMeetingId = "convo-meeting-mock-id";
  const mockUserIdOne = "user-mock-id-one";
  const mockUserIdTwo = "user-mock-id-two";

  const mockUser: User = {
    id: mockUserIdOne,
    image: "mock-image",
  };

  const mockMeeting: Meeting = {
    id: mockMeetingId,
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
    createdAt: new Date().toISOString(),
    dueDate: new Date().toISOString(),
  };

  const mockMessage: Message = {
    id: mockMessageId,
    to: mockMeetingId,
    from: mockUserIdOne,
    type: "meeting",
    createdAt: new Date().toISOString(),
    seenAt: { [mockUserIdOne]: new Date().toISOString(), mockUserIdTwo: null },
    reactions: {},
    replyCount: 0,
    mimeType: "audio/mpeg",
    fetchUrl: "mock-fetch-url",
    fromImage: "mock-from-image",
  };

  const mockRecord = {
    topicArn: mockMeetingMessageUpdatedSnsTopicArn,
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

    meetingMessageUpdatedSnsProcessorService = new MeetingMessageUpdatedSnsProcessorService(loggerService, webSocketMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.meetingMessageUpdated in the config", () => {
        it("returns true", () => {
          const result = meetingMessageUpdatedSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.meetingMessageUpdated in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = meetingMessageUpdatedSnsProcessorService.determineRecordSupport(record);

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
        await meetingMessageUpdatedSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.MeetingMessageUpdated, data: { to: mockMeeting, from: mockUser, message: mockMessage } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.MeetingMessageUpdated, data: { to: mockMeeting, from: mockUser, message: mockMessage } });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketMediatorService.sendMessage throws an error", () => {
        beforeEach(() => {
          webSocketMediatorService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await meetingMessageUpdatedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, meetingMessageUpdatedSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await meetingMessageUpdatedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
