/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Group } from "@yac/util";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { UserRemovedFromGroupSnsProcessorService } from "../userRemovedFromGroup.sns.processor.service";

describe("UserRemovedFromGroupSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let userRemovedFromGroupSnsProcessorService: SnsProcessorServiceInterface;

  const mockUserRemovedFromGroupSnsTopicArn = "mock-user-added-to-group-sns-topic-arn";
  const mockConfig = { snsTopicArns: { userRemovedFromGroup: mockUserRemovedFromGroupSnsTopicArn } };
  const mockUserIdOne = "user-mock-id-one";
  const mockUserIdTwo = "user-mock-id-two";
  const mockGroupMemberIds = [ mockUserIdOne, mockUserIdTwo ];

  const mockUser: User = {
    id: mockUserIdOne,
    image: "mock-image",
  };

  const mockGroup: Group = {
    id: "group_mock-id",
    name: "mock-name",
    image: "mock-image",
    createdBy: "user-mock-id",
    createdAt: new Date().toISOString(),
  };

  const mockRecord = {
    topicArn: mockUserRemovedFromGroupSnsTopicArn,
    message: {
      user: mockUser,
      group: mockGroup,
      groupMemberIds: mockGroupMemberIds,
    },
  };
  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    webSocketMediatorService = TestSupport.spyOnClass(WebSocketMediatorService);

    userRemovedFromGroupSnsProcessorService = new UserRemovedFromGroupSnsProcessorService(loggerService, webSocketMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.userRemovedFromGroup in the config", () => {
        it("returns true", () => {
          const result = userRemovedFromGroupSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.userRemovedFromGroup in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = userRemovedFromGroupSnsProcessorService.determineRecordSupport(record);

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
        await userRemovedFromGroupSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.UserRemovedFromGroup, data: { group: mockGroup, user: mockUser } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdTwo, event: WebSocketEvent.UserRemovedFromGroup, data: { group: mockGroup, user: mockUser } });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketMediatorService.sendMessage throws an error", () => {
        beforeEach(() => {
          webSocketMediatorService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userRemovedFromGroupSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userRemovedFromGroupSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userRemovedFromGroupSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
