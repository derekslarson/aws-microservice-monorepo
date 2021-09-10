/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Message, Group } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { GroupMessageCreatedSnsProcessorService } from "../groupMessageCreated.sns.processor.service";

describe("GroupMessageCreatedSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let groupMessageCreatedSnsProcessorService: SnsProcessorServiceInterface;

  const mockGroupMessageCreatedSnsTopicArn = "mock-group-message-created-sns-topic-arn";
  const mockConfig = { snsTopicArns: { groupMessageCreated: mockGroupMessageCreatedSnsTopicArn } };
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

    groupMessageCreatedSnsProcessorService = new GroupMessageCreatedSnsProcessorService(loggerService, webSocketMediatorService, mockConfig);
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

      it("calls webSocketMediatorService.sendMessage with the correct parameters", async () => {
        await groupMessageCreatedSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.GroupMessageCreated, data: { to: mockGroup, from: mockUser, message: mockMessage } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.GroupMessageCreated, data: { to: mockGroup, from: mockUser, message: mockMessage } });
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
