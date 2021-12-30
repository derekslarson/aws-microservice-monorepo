/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { UserAddedAsFriendSnsMessage } from "@yac/util";
import { backoff, createRandomAuthServiceUser, sns } from "../../../../e2e/util";
import { WebSocketEvent } from "../../src/enums/webSocket.event.enum";
import { createWebSocketListener, deleteSnsEventsByTopicArn, getSnsEventsByTopicArn, registerMockDevice, RegisterMockDeviceOutput, WebSocketListener } from "../util";

describe("User Added As Friend SNS Topic", () => {
  const userAddedAsFriendSnsTopicArn = process.env["user-added-as-friend-sns-topic-arn"] as string;
  const pushNotificationFailedSnsTopicArn = process.env["push-notification-failed-sns-topic-arn"] as string;
  let userOneId: `user_${string}`;
  let userTwoId: `user_${string}`;
  let userThreeId: `user_${string}`;

  beforeAll(async () => {
    // Create three users in cognito
    ([ { id: userOneId }, { id: userTwoId }, { id: userThreeId } ] = await Promise.all([
      createRandomAuthServiceUser(),
      createRandomAuthServiceUser(),
      createRandomAuthServiceUser(),
    ]));
  });

  describe("under normal conditons", () => {
    describe("when a message is published to the sns topic", () => {
      describe("web sockets", () => {
        let userOneAWebSocketListener: WebSocketListener;
        let userOneBWebSocketListener: WebSocketListener;
        let userTwoWebSocketListener: WebSocketListener;
        let userThreeWebSocketListener: WebSocketListener;

        beforeAll(async () => {
          ([
            userOneAWebSocketListener,
            userOneBWebSocketListener,
            userTwoWebSocketListener,
            userThreeWebSocketListener,
          ] = await Promise.all([
            createWebSocketListener({ userId: userOneId, eventType: WebSocketEvent.UserAddedAsFriend }),
            createWebSocketListener({ userId: userOneId, eventType: WebSocketEvent.UserAddedAsFriend }),
            createWebSocketListener({ userId: userTwoId, eventType: WebSocketEvent.UserAddedAsFriend }),
            createWebSocketListener({ userId: userThreeId, eventType: WebSocketEvent.UserAddedAsFriend }),
          ]));
        });

        beforeEach(() => {
          userOneAWebSocketListener.clearMessages();
          userOneBWebSocketListener.clearMessages();
          userTwoWebSocketListener.clearMessages();
          userThreeWebSocketListener.clearMessages();
        });

        it("sends valid websocket events to the correct connectionIds", async () => {
          const message: UserAddedAsFriendSnsMessage = {
            addingUser: {
              id: userOneId,
              image: "test-image-one",
            },
            addedUser: {
              id: userTwoId,
              image: "test-image-two",
            },
          };

          await sns.publish({
            TopicArn: userAddedAsFriendSnsTopicArn,
            Message: JSON.stringify(message),
          }).promise();

          // Wait until all the expected messages arrive
          await Promise.all([
            backoff(() => Promise.resolve(userOneAWebSocketListener.messages), (arr) => arr.length > 0),
            backoff(() => Promise.resolve(userOneBWebSocketListener.messages), (arr) => arr.length > 0),
            backoff(() => Promise.resolve(userTwoWebSocketListener.messages), (arr) => arr.length > 0),
          ]);

          // Assert that they have the right structure
          expect(userOneAWebSocketListener.messages.length).toBe(1);
          expect(userOneAWebSocketListener.messages[0]).toEqual({
            event: WebSocketEvent.UserAddedAsFriend,
            data: {
              addingUser: message.addingUser,
              addedUser: message.addedUser,
            },
          });

          expect(userOneBWebSocketListener.messages.length).toBe(1);
          expect(userOneBWebSocketListener.messages[0]).toEqual({
            event: WebSocketEvent.UserAddedAsFriend,
            data: {
              addingUser: message.addingUser,
              addedUser: message.addedUser,
            },
          });

          expect(userTwoWebSocketListener.messages.length).toBe(1);
          expect(userTwoWebSocketListener.messages[0]).toEqual({
            event: WebSocketEvent.UserAddedAsFriend,
            data: {
              addingUser: message.addingUser,
              addedUser: message.addedUser,
            },
          });

          expect(userThreeWebSocketListener.messages.length).toBe(0);
        });
      });

      describe("push notifications", () => {
        let userOneAMockDevice: RegisterMockDeviceOutput;
        let userOneBMockDevice: RegisterMockDeviceOutput;

        beforeAll(async () => {
          ([ userOneAMockDevice, userOneBMockDevice ] = await Promise.all([
            registerMockDevice({ userId: userOneId }),
            registerMockDevice({ userId: userOneId }),
            registerMockDevice({ userId: userTwoId }),
            registerMockDevice({ userId: userThreeId }),
          ]));
        });

        beforeEach(async () => {
          // clear the sns events table so the test can have a clean slate
          await deleteSnsEventsByTopicArn({ topicArn: pushNotificationFailedSnsTopicArn });
        });

        it("sends valid push notification events to the correct device tokens", async () => {
          const message: UserAddedAsFriendSnsMessage = {
            addingUser: {
              id: userTwoId,
              image: "test-image-two",
            },
            addedUser: {
              id: userOneId,
              image: "test-image-one",
            },
          };

          await sns.publish({
            TopicArn: userAddedAsFriendSnsTopicArn,
            Message: JSON.stringify(message),
          }).promise();

          // We are sending to mock tokens that aren't registered with FCM.
          // If we get back an InvalidPlatformToken failure, it means everything about
          // the push notification was valid, but that it was to an invalid token.
          // Therefore, we just need to check that there are errors like this for the users
          // we expect to get a push notification
          const { snsEvents } = await backoff(
            () => getSnsEventsByTopicArn({ topicArn: pushNotificationFailedSnsTopicArn }),
            (response) => response.snsEvents.length === 2,
          );

          expect(snsEvents.length).toBe(2);

          expect(snsEvents).toContain(jasmine.objectContaining({
            message: jasmine.objectContaining({
              FailureType: "InvalidPlatformToken",
              EndpointArn: userOneAMockDevice.endpointArn,
            }),
          }));

          expect(snsEvents).toContain(jasmine.objectContaining({
            message: jasmine.objectContaining({
              FailureType: "InvalidPlatformToken",
              EndpointArn: userOneBMockDevice.endpointArn,
            }),
          }));
        });
      });
    });
  });
});
