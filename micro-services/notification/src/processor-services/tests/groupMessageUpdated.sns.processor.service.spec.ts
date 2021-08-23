/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Message, Group } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { GroupMessageUpdatedSnsProcessorService } from "../groupMessageUpdated.sns.processor.service";

describe("GroupMessageUpdatedSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let groupMessageUpdatedSnsProcessorService: SnsProcessorServiceInterface;

  const mockGroupMessageUpdatedSnsTopicArn = "mock-group-message-updated-sns-topic-arn";
  const mockConfig = { snsTopicArns: { groupMessageUpdated: mockGroupMessageUpdatedSnsTopicArn } };
  const mockMessageId = "message-id";
  const mockGroupId = "convo-group-mock-id";
  const mockUserIdOne = "user-mock-id-one";
  const mockUserIdTwo = "user-mock-id-two";

  const mockUser: User = {
    id: mockUserIdOne,
    image: "mock-image",
  };

  const mockGroup: Group = {
    id: mockGroupId,
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
    createdAt: new Date().toISOString(),
  };

  const mockMessage: Message = {
    id: mockMessageId,
    to: mockGroupId,
    from: mockUserIdOne,
    type: "group",
    createdAt: new Date().toISOString(),
    seenAt: { [mockUserIdOne]: new Date().toISOString(), mockUserIdTwo: null },
    reactions: {},
    replyCount: 0,
    mimeType: "audio/mpeg",
    fetchUrl: "mock-fetch-url",
    fromImage: "mock-from-image",
  };

  const mockRecord = {
    topicArn: mockGroupMessageUpdatedSnsTopicArn,
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

    groupMessageUpdatedSnsProcessorService = new GroupMessageUpdatedSnsProcessorService(loggerService, webSocketMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.groupMessageUpdated in the config", () => {
        it("returns true", () => {
          const result = groupMessageUpdatedSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.groupMessageUpdated in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = groupMessageUpdatedSnsProcessorService.determineRecordSupport(record);

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
        await groupMessageUpdatedSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.GroupMessageUpdated, data: { to: mockGroup, from: mockUser, message: mockMessage } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.GroupMessageUpdated, data: { to: mockGroup, from: mockUser, message: mockMessage } });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketMediatorService.sendMessage throws an error", () => {
        beforeEach(() => {
          webSocketMediatorService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await groupMessageUpdatedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, groupMessageUpdatedSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await groupMessageUpdatedSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
