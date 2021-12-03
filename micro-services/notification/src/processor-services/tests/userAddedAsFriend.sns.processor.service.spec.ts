/* eslint-disable @typescript-eslint/unbound-method */
import { LoggerService, Spied, TestSupport, SnsProcessorServiceInterface, User } from "@yac/util";
import { PushNotificationEvent } from "../../enums/pushNotification.event.enum";
import { WebSocketEvent } from "../../enums/webSocket.event.enum";
import { PushNotificationMediatorService, PushNotificationMediatorServiceInterface } from "../../mediator-services/pushNotification.mediator.service";
import { WebSocketMediatorService, WebSocketMediatorServiceInterface } from "../../mediator-services/webSocket.mediator.service";
import { UserAddedAsFriendSnsProcessorService } from "../userAddedAsFriend.sns.processor.service";

describe("UserAddedAsFriendSnsProcessorService", () => {
  let loggerService: Spied<LoggerService>;
  let webSocketMediatorService: Spied<WebSocketMediatorServiceInterface>;
  let pushNotificationMediatorService: Spied<PushNotificationMediatorServiceInterface>;
  let userAddedAsFriendSnsProcessorService: SnsProcessorServiceInterface;

  const mockUserAddedAsFriendSnsTopicArn = "mock-user-added-as-friend-sns-topic-arn";
  const mockConfig = { snsTopicArns: { userAddedAsFriend: mockUserAddedAsFriendSnsTopicArn } };
  const mockUserIdOne = "user-mock-id-one";
  const mockUserIdTwo = "user-mock-id-two";

  const mockUserOne: User = {
    id: mockUserIdOne,
    image: "mock-image",
    name: "mock-name",
  };

  const mockUserTwo: User = {
    id: mockUserIdTwo,
    image: "mock-image",
  };

  const mockRecord = {
    topicArn: mockUserAddedAsFriendSnsTopicArn,
    message: {
      addingUser: mockUserOne,
      addedUser: mockUserTwo,
    },
  };
  const mockError = new Error("test");

  beforeEach(() => {
    loggerService = TestSupport.spyOnClass(LoggerService);
    webSocketMediatorService = TestSupport.spyOnClass(WebSocketMediatorService);
    pushNotificationMediatorService = TestSupport.spyOnClass(PushNotificationMediatorService);

    userAddedAsFriendSnsProcessorService = new UserAddedAsFriendSnsProcessorService(loggerService, webSocketMediatorService, pushNotificationMediatorService, mockConfig);
  });

  describe("determineRecordSupport", () => {
    describe("under normal conditions", () => {
      describe("when passed a record with a topic arn matching snsTopicArns.userAddedAsFriend in the config", () => {
        it("returns true", () => {
          const result = userAddedAsFriendSnsProcessorService.determineRecordSupport(mockRecord);

          expect(result).toBe(true);
        });
      });

      describe("when passed a record with a topic arn not matching snsTopicArns.userAddedAsFriend in the config", () => {
        const record = {
          ...mockRecord,
          topicArn: "test",
        };

        it("returns false", () => {
          const result = userAddedAsFriendSnsProcessorService.determineRecordSupport(record);

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
          await userAddedAsFriendSnsProcessorService.processRecord(mockRecord);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockUserIdTwo,
            event: PushNotificationEvent.UserAddedAsFriend,
            title: "Added as Friend",
            body: `${mockUserOne.name as string} added you as a friend`,
          });
        });
      });

      describe("when from.name isn't defined, but from.username is", () => {
        const mockRecordTwo = {
          ...mockRecord,
          message: {
            ...mockRecord.message,
            addingUser: {
              id: mockRecord.message.addingUser.id,
              username: "mock-username",
            },
          },
        };
        it("calls pushNotificationMediatorService.sendPushNotification with the correct parameters", async () => {
          await userAddedAsFriendSnsProcessorService.processRecord(mockRecordTwo);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockUserIdTwo,
            event: PushNotificationEvent.UserAddedAsFriend,
            title: "Added as Friend",
            body: `${mockRecordTwo.message.addingUser.username} added you as a friend`,
          });
        });
      });

      describe("when from.name and from.username aren't defined, but from.email is", () => {
        const mockRecordTwo = {
          ...mockRecord,
          message: {
            ...mockRecord.message,
            addingUser: {
              id: mockRecord.message.addingUser.id,
              email: "mock-email",
            },
          },
        };
        it("calls pushNotificationMediatorService.sendPushNotification with the correct parameters", async () => {
          await userAddedAsFriendSnsProcessorService.processRecord(mockRecordTwo);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockUserIdTwo,
            event: PushNotificationEvent.UserAddedAsFriend,
            title: "Added as Friend",
            body: `${mockRecordTwo.message.addingUser.email} added you as a friend`,
          });
        });
      });

      describe("when from.name, from.username and from.email aren't defined, but from.phone is", () => {
        const mockRecordTwo = {
          ...mockRecord,
          message: {
            ...mockRecord.message,
            addingUser: {
              id: mockRecord.message.addingUser.id,
              phone: "mock-phone",
            },
          },
        };
        it("calls pushNotificationMediatorService.sendPushNotification with the correct parameters", async () => {
          await userAddedAsFriendSnsProcessorService.processRecord(mockRecordTwo);

          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledTimes(1);
          expect(pushNotificationMediatorService.sendPushNotification).toHaveBeenCalledWith({
            userId: mockUserIdTwo,
            event: PushNotificationEvent.UserAddedAsFriend,
            title: "Added as Friend",
            body: `${mockRecordTwo.message.addingUser.phone} added you as a friend`,
          });
        });
      });

      it("calls webSocketMediatorService.sendMessage with the correct parameters", async () => {
        await userAddedAsFriendSnsProcessorService.processRecord(mockRecord);

        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledTimes(2);
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdOne, event: WebSocketEvent.UserAddedAsFriend, data: { addingUser: mockUserOne, addedUser: mockUserTwo } });
        expect(webSocketMediatorService.sendMessage).toHaveBeenCalledWith({ userId: mockUserIdTwo, event: WebSocketEvent.UserAddedAsFriend, data: { addingUser: mockUserOne, addedUser: mockUserTwo } });
      });
    });

    describe("under error conditions", () => {
      describe("when webSocketMediatorService.sendMessage throws an error", () => {
        beforeEach(() => {
          webSocketMediatorService.sendMessage.and.throwError(mockError);
        });

        it("calls loggerService.error with the correct params", async () => {
          try {
            await userAddedAsFriendSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(loggerService.error).toHaveBeenCalledTimes(1);
            expect(loggerService.error).toHaveBeenCalledWith("Error in processRecord", { error: mockError, record: mockRecord }, userAddedAsFriendSnsProcessorService.constructor.name);
          }
        });

        it("throws the caught error", async () => {
          try {
            await userAddedAsFriendSnsProcessorService.processRecord(mockRecord);

            fail("Should have thrown");
          } catch (error) {
            expect(error).toBe(mockError);
          }
        });
      });
    });
  });
});
