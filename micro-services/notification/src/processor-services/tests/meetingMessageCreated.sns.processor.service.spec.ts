/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Message, Meeting } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { MeetingMessageCreatedSnsProcessorService } from "../meetingMessageCreated.sns.processor.service";

describe("MeetingMessageCreatedSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let meetingMessageCreatedSnsProcessorService: SnsProcessorServiceInterface;

  const mockMeetingMessageCreatedSnsTopicArn = "mock-meeting-message-created-sns-topic-arn";
  const mockConfig = { snsTopicArns: { meetingMessageCreated: mockMeetingMessageCreatedSnsTopicArn } };
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

    meetingMessageCreatedSnsProcessorService = new MeetingMessageCreatedSnsProcessorService(loggerService, webSocketMediatorService, mockConfig);
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

      it("calls webSocketMediatorService.sendMessage with the correct parameters", async () => {
        await meetingMessageCreatedSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.MeetingMessageCreated, data: { to: mockMeeting, from: mockUser, message: mockMessage } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.MeetingMessageCreated, data: { to: mockMeeting, from: mockUser, message: mockMessage } });
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
