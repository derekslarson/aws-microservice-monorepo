/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User, Group } from "@yac/util";
import { PushNotificationEvent } from "../../enums/pushNotification.event.enum";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { PushNotificationMediatorService, PushNotificationMediatorServiceInterface } from "../../mediator-services/pushNotification.mediator.service";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { UserAddedToGroupSnsProcessorService } from "../userAddedToGroup.sns.processor.service";

describe("UserAddedToGroupSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let pushNotificationMediatorService: Spied<PushNotificationMediatorServiceInterface>;
  let userAddedToGroupSnsProcessorService: SnsProcessorServiceInterface;

  const mockUserAddedToGroupSnsTopicArn = "mock-user-added-to-group-sns-topic-arn";
  const mockConfig = { snsTopicArns: { userAddedToGroup: mockUserAddedToGroupSnsTopicArn } };
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
    topicArn: mockUserAddedToGroupSnsTopicArn,
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
    pushNotificationMediatorService = TestSupport.spyOnClass(PushNotificationMediatorService);

    userAddedToGroupSnsProcessorService = new UserAddedToGroupSnsProcessorService(loggerService, webSocketMediatorService, pushNotificationMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.userAddedToGroup in the config", () => {
        it("returns true", () => {
          const result = userAddedToGroupSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.userAddedToGroup in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = userAddedToGroupSnsProcessorService.determineRecordSupport(record);

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
        await userAddedToGroupSnsProcessorService.processRecord(mockRecord);

        expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
        expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
          userId: mockUserIdOne,
          event: PushNotificationEvent.UserAddedToGroup,
          title: "Added to Group",
          body: `You've been added to the group ${mockGroup.name}`,
        });
      });

      it("calls webSocketMediatorService.sendMessage with the correct parameters", async () => {
        await userAddedToGroupSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.UserAddedToGroup, data: { group: mockGroup, user: mockUser } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdTwo, event: WebSocketEvent.UserAddedToGroup, data: { group: mockGroup, user: mockUser } });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketMediatorService.sendMessage throws an error", () => {
        beforeEach(() => {
          webSocketMediatorService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userAddedToGroupSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userAddedToGroupSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userAddedToGroupSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
